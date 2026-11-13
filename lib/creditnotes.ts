import "server-only";
import { getAdminClient } from "@/lib/supabase/admin";
import { zoho, zohoConfig, zohoVatTaxId, ZohoError } from "@/lib/zoho/books";
import { computeRefund, isReason } from "@/lib/returns";

// Returns in Zoho Books. A refund or exchange is recorded as a credit note against the customer (the
// suits she sent back, at the price she paid, VAT inside). A refund then records the bank transfer;
// an exchange keeps the credit open until the exchange order's invoice is made (applyExchangeCredit).
// Runs with the secret key: call only after checking the staff member's role.

const riyadhDate = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh" }).format(new Date());
const STALE_MS = 5 * 60 * 1000;

export type CreditOutcome = { ok: true } | { ok: false; error: string };

type ReturnRow = {
  id: string;
  return_no: string;
  order_id: string;
  reason: string;
  resolution: "refund" | "exchange";
  refund_sar: number;
  credit_note_status: string;
  credit_note_zoho_id: string | null;
  refund_recorded: boolean;
  updated_at: string;
};

export async function issueCreditNote(returnId: string): Promise<CreditOutcome> {
  const db = getAdminClient();
  if (!db) return { ok: false, error: "The server can't reach the database." };
  const stale = new Date(Date.now() - STALE_MS).toISOString();
  // Claim it, so two clicks can't create two credit notes.
  const { data: rt } = await db
    .from("returns")
    .update({ credit_note_status: "pending", zoho_error: null })
    .eq("id", returnId)
    .in("status", ["received"])
    .or(`credit_note_status.in.(none,failed),and(credit_note_status.eq.pending,updated_at.lt.${stale})`)
    .select("id, return_no, order_id, reason, resolution, refund_sar, credit_note_status, credit_note_zoho_id, refund_recorded, updated_at")
    .maybeSingle<ReturnRow>();
  if (!rt) {
    const { data: now } = await db.from("returns").select("credit_note_status, status").eq("id", returnId).maybeSingle();
    if (now?.credit_note_status === "issued") return { ok: true };
    return { ok: false, error: now?.status !== "received" ? "Mark the suit as received first." : "Another try is running. Wait a minute and try again." };
  }
  const fail = async (message: string): Promise<CreditOutcome> => {
    console.error(`[credit note] ${rt.return_no}: ${message}`);
    await db.from("returns").update({ credit_note_status: "failed", zoho_error: message.slice(0, 400) }).eq("id", returnId);
    return { ok: false, error: message };
  };

  try {
    const c = zohoConfig();
    if (!c) throw new ZohoError("Zoho Books isn't connected yet (ZOHO_* keys missing on the server).", false);
    const { data: o } = await db
      .from("orders")
      .select("order_no, customer_phone, invoice_status, bundle_discount_sar, code_discount_sar, perk_discount_sar, delivery_fee_sar, packaging_fee_sar, order_items (id, product_code, product_name, unit_price_sar, qty, created_at)")
      .eq("id", rt.order_id)
      .maybeSingle();
    if (!o) throw new ZohoError("The order is missing.", false);
    if (o.invoice_status !== "issued") throw new ZohoError(`Order ${o.order_no} has no Zoho invoice yet. Issue the invoice first (Orders → the order).`, false);
    const { data: contact } = await db.from("zoho_contacts").select("contact_id").eq("phone", o.customer_phone).maybeSingle();
    if (!contact) throw new ZohoError("The customer isn't in Zoho Books yet.", false);
    const { data: ri } = await db.from("return_items").select("order_item_id, qty").eq("return_id", returnId);

    type Item = { id: string; product_code: string; product_name: string; unit_price_sar: number; qty: number; created_at: string };
    const items = ((o.order_items ?? []) as Item[]).sort((a, b) => a.created_at.localeCompare(b.created_at));
    const refund = computeRefund(
      {
        items: items.map((i) => ({ id: i.id, code: i.product_code, name: i.product_name, unitPrice: Number(i.unit_price_sar), qty: i.qty })),
        discount: Number(o.bundle_discount_sar) + Number(o.code_discount_sar) + Number(o.perk_discount_sar ?? 0),
        deliveryFee: Number(o.delivery_fee_sar),
        packagingFee: Number(o.packaging_fee_sar),
      },
      (ri ?? []).map((x) => ({ orderItemId: x.order_item_id, qty: x.qty })),
      isReason(rt.reason) ? rt.reason : "other",
    );
    if (!refund.lines.length) throw new ZohoError("The return has no suits.", false);
    if (Math.abs(refund.total - Number(rt.refund_sar)) > 0.01) throw new ZohoError(`The return's lines add up to ${refund.total} but its refund is ${rt.refund_sar}.`, false);

    let creditId = rt.credit_note_zoho_id;
    if (!creditId) {
      const { data: vat } = await db.from("settings").select("value").eq("key", "vat_rate_pct").maybeSingle();
      const vatPct = Number(vat?.value ?? 15);
      const tax = vatPct > 0 ? { tax_id: await zohoVatTaxId(c, vatPct) } : {};
      const line_items = [
        ...refund.lines.map((l) => ({ name: l.name.slice(0, 100), description: l.code, rate: l.unitPaid, quantity: l.qty, ...tax })),
        ...(refund.extras.delivery > 0 ? [{ name: "Delivery · التوصيل", rate: refund.extras.delivery, quantity: 1, ...tax }] : []),
        ...(refund.extras.packaging > 0 ? [{ name: "Gift box · علبة الهدايا", rate: refund.extras.packaging, quantity: 1, ...tax }] : []),
      ];
      const made = await zoho<{ creditnote?: { creditnote_id: string; creditnote_number: string; total: number } }>(c, "POST", "/creditnotes", {
        customer_id: contact.contact_id,
        date: riyadhDate(),
        reference_number: rt.return_no,
        is_inclusive_tax: vatPct > 0,
        line_items,
        notes: `Return ${rt.return_no} of order ${o.order_no} · إرجاع ${rt.return_no} للطلب ${o.order_no}`,
      });
      if (!made.creditnote?.creditnote_id) throw new ZohoError("Zoho didn't return a credit note id.", true);
      creditId = made.creditnote.creditnote_id;
      if (Math.abs(Number(made.creditnote.total) - refund.total) > 0.01) {
        await db.from("returns").update({ credit_note_zoho_id: creditId, credit_note_no: made.creditnote.creditnote_number }).eq("id", returnId);
        throw new ZohoError(`Credit note ${made.creditnote.creditnote_number} totals ${made.creditnote.total} in Zoho but the refund is ${refund.total}. Fix it in Zoho Books.`, false);
      }
      await db.from("returns").update({ credit_note_zoho_id: creditId, credit_note_no: made.creditnote.creditnote_number }).eq("id", returnId);
    }
    await db.from("returns").update({ credit_note_status: "issued", zoho_error: null }).eq("id", returnId);
    if (rt.resolution === "refund" && !rt.refund_recorded) await recordRefund(returnId);
    return { ok: true };
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err));
  }
}

// Records the bank transfer against the credit note. If Zoho refuses (e.g. it wants a bank account),
// the credit note stays and staff see the message: record the refund in Zoho Books, or set the refund
// account in Settings and try again.
export async function recordRefund(returnId: string): Promise<CreditOutcome> {
  const db = getAdminClient();
  const c = zohoConfig();
  if (!db || !c) return { ok: false, error: "Zoho Books isn't connected." };
  const { data: rt } = await db.from("returns").select("return_no, refund_sar, credit_note_zoho_id, refund_recorded").eq("id", returnId).maybeSingle();
  if (!rt?.credit_note_zoho_id) return { ok: false, error: "No credit note yet." };
  if (rt.refund_recorded) return { ok: true };
  try {
    const { data: acc } = await db.from("settings").select("value").eq("key", "zoho_refund_account_id").maybeSingle();
    const account = typeof acc?.value === "string" && /^\d{5,30}$/.test(acc.value) ? acc.value : null;
    await zoho(c, "POST", `/creditnotes/${encodeURIComponent(rt.credit_note_zoho_id)}/refunds`, {
      date: riyadhDate(),
      refund_mode: "banktransfer",
      amount: Number(rt.refund_sar),
      reference_number: rt.return_no,
      description: `Bank transfer refund for return ${rt.return_no}`,
      ...(account ? { from_account_id: account } : {}),
    });
    await db.from("returns").update({ refund_recorded: true, zoho_error: null }).eq("id", returnId);
    return { ok: true };
  } catch (err) {
    const message = `Credit note made, but the refund couldn't be recorded: ${err instanceof Error ? err.message : String(err)}`;
    await db.from("returns").update({ zoho_error: message.slice(0, 400) }).eq("id", returnId);
    return { ok: false, error: message };
  }
}

// Exchange: when the exchange order's invoice is made, use the open credit from the returned suits, so
// only the difference is recorded as cash collected. Returns the amount applied.
export async function applyExchangeCredit(orderId: string, invoiceId: string, balance: number): Promise<number> {
  const db = getAdminClient();
  const c = zohoConfig();
  if (!db || !c || balance <= 0) return 0;
  const { data: rows } = await db
    .from("returns")
    .select("id, refund_sar, credit_note_zoho_id")
    .eq("exchange_order_id", orderId)
    .eq("credit_note_status", "issued")
    .eq("credit_applied", false);
  let applied = 0;
  for (const r of rows ?? []) {
    const amount = Math.min(Number(r.refund_sar), balance - applied);
    if (!r.credit_note_zoho_id || amount <= 0) continue;
    await zoho(c, "POST", `/creditnotes/${encodeURIComponent(r.credit_note_zoho_id)}/invoices`, { invoices: [{ invoice_id: invoiceId, amount_applied: amount }] });
    await db.from("returns").update({ credit_applied: true }).eq("id", r.id);
    applied += amount;
  }
  return Math.round(applied * 100) / 100;
}
