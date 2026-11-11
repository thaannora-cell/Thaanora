import "server-only";
import { getTranslations } from "next-intl/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { buildInvoice, expectedTotal, type InvoiceOrder } from "@/lib/invoice-build";
import { zoho, zohoConfig, zohoVatTaxId, ZohoError } from "@/lib/zoho/books";

export type InvoiceOutcome = "issued" | "failed" | "busy" | "skipped";

const STALE_MS = 5 * 60 * 1000; // a "pending" older than this was interrupted and may be picked up again

// Today's date in Riyadh, as Zoho wants it (yyyy-mm-dd).
const riyadhDate = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh" }).format(new Date());

// Invoice wording in English and Arabic, from the translation files.
async function labels(orderNo: string) {
  const [en, ar] = await Promise.all([getTranslations({ locale: "en", namespace: "Invoice" }), getTranslations({ locale: "ar", namespace: "Invoice" })]);
  const both = (k: "giftBox" | "delivery") => `${en(k)} · ${ar(k)}`;
  return { giftBox: both("giftBox"), delivery: both("delivery"), notes: `${en("notes", { orderNo })}\n${ar("notes", { orderNo })}` };
}

// Creates the simplified tax invoice in Zoho Books for a delivered order, marks it sent and records the
// cash payment. Each step is saved as it succeeds, so a retry carries on where the last try stopped and
// never makes a second invoice. Runs with the secret key: call it only after checking the person's role.
export async function issueInvoice(orderId: string): Promise<InvoiceOutcome> {
  const db = getAdminClient();
  if (!db) return "failed";
  const now = new Date();

  // Claim the order, so two clicks (or the daily retry) can't create two invoices at once.
  const { data: claimed } = await db
    .from("orders")
    .update({ invoice_status: "pending", invoice_tried_at: now.toISOString() })
    .eq("id", orderId)
    .eq("status", "delivered_cash_collected")
    .or(`invoice_status.in.(none,failed),and(invoice_status.eq.pending,invoice_tried_at.lt.${new Date(now.getTime() - STALE_MS).toISOString()})`)
    .select("id, order_no, customer_name, customer_phone, area, discount_code, bundle_discount_sar, code_discount_sar, packaging_fee_sar, delivery_fee_sar, total_sar, invoice_zoho_id, invoice_paid, invoice_attempts")
    .maybeSingle();
  if (!claimed) {
    const { data: o } = await db.from("orders").select("status, invoice_status").eq("id", orderId).maybeSingle();
    return o?.status !== "delivered_cash_collected" ? "skipped" : o.invoice_status === "issued" ? "issued" : "busy";
  }

  const save = (fields: Record<string, unknown>) => db.from("orders").update(fields).eq("id", orderId);
  const attempts = (claimed.invoice_attempts ?? 0) + 1;

  try {
    const c = zohoConfig();
    if (!c) throw new ZohoError("Zoho Books isn't connected yet (ZOHO_* keys missing on the server).", false);
    const total = Number(claimed.total_sar);
    const date = riyadhDate();
    let invoiceId: string | null = claimed.invoice_zoho_id;

    // 1. The customer: one Zoho contact per phone number.
    const phone = String(claimed.customer_phone);
    let customerId: string | null = null;
    {
      const { data: known } = await db.from("zoho_contacts").select("contact_id").eq("phone", phone).maybeSingle();
      customerId = known?.contact_id ?? null;
    }
    if (!customerId) {
      const made = await zoho<{ contact?: { contact_id: string } }>(c, "POST", "/contacts", {
        contact_name: `${String(claimed.customer_name).slice(0, 80)} · ${phone}`,
        contact_type: "customer",
        contact_persons: [{ first_name: String(claimed.customer_name).slice(0, 80), mobile: phone, is_primary_contact: true }],
        notes: "Thaanora website customer",
      });
      customerId = made.contact?.contact_id ?? null;
      if (!customerId) throw new ZohoError("Zoho didn't return a customer id.", true);
      await db.from("zoho_contacts").upsert({ phone, contact_id: customerId });
    }

    // 2. The invoice (only if an earlier try didn't already create it).
    if (!invoiceId) {
      const { data: items } = await db.from("order_items").select("product_code, product_name, unit_price_sar, qty").eq("order_id", orderId).order("created_at");
      const { data: vat } = await db.from("settings").select("value").eq("key", "vat_rate_pct").maybeSingle();
      const vatPct = Number(vat?.value ?? 15);
      const order: InvoiceOrder = {
        orderNo: claimed.order_no,
        area: claimed.area,
        items: (items ?? []).map((i) => ({ code: i.product_code, name: i.product_name, unitPrice: Number(i.unit_price_sar), qty: i.qty })),
        bundleDiscount: Number(claimed.bundle_discount_sar),
        codeDiscount: Number(claimed.code_discount_sar),
        discountCode: claimed.discount_code,
        packagingFee: Number(claimed.packaging_fee_sar),
        deliveryFee: Number(claimed.delivery_fee_sar),
        total,
      };
      if (!order.items.length) throw new ZohoError("The order has no suits to invoice.", false);
      const body = buildInvoice(order, { customerId, date, taxId: vatPct > 0 ? await zohoVatTaxId(c, vatPct) : null, labels: await labels(claimed.order_no) });
      if (Math.abs(expectedTotal(body) - total) > 0.01) {
        throw new ZohoError(`The order's lines add up to ${expectedTotal(body)} but its total is ${total}. Check the order.`, false);
      }
      const made = await zoho<{ invoice?: { invoice_id: string; invoice_number: string; invoice_url?: string; total: number } }>(c, "POST", "/invoices", body);
      if (!made.invoice?.invoice_id) throw new ZohoError("Zoho didn't return an invoice id.", true);
      invoiceId = made.invoice.invoice_id;
      await save({ invoice_zoho_id: invoiceId, invoice_no: made.invoice.invoice_number, invoice_url: made.invoice.invoice_url ?? null });
    }

    // 3. Check Zoho's total matches the cash collected, then mark it sent and record the cash payment.
    const current = await zoho<{ invoice?: { invoice_number: string; invoice_url?: string; total: number; status: string; balance: number } }>(c, "GET", `/invoices/${encodeURIComponent(invoiceId)}`);
    const inv = current.invoice;
    if (!inv) throw new ZohoError("Zoho didn't return the invoice.", true);
    if (Math.abs(Number(inv.total) - total) > 0.01) {
      throw new ZohoError(`Invoice ${inv.invoice_number} totals ${inv.total} in Zoho but the order is ${total}. Fix it in Zoho Books, then retry.`, false);
    }
    if (inv.status === "draft") await zoho(c, "POST", `/invoices/${encodeURIComponent(invoiceId)}/status/sent`);
    if (!claimed.invoice_paid && Number(inv.balance) > 0) {
      await zoho(c, "POST", "/customerpayments", {
        customer_id: customerId,
        payment_mode: "cash",
        amount: Number(inv.balance),
        date,
        reference_number: claimed.order_no,
        description: "Cash on delivery",
        invoices: [{ invoice_id: invoiceId, amount_applied: Number(inv.balance) }],
      });
    }

    await save({
      invoice_status: "issued",
      invoice_no: inv.invoice_number,
      invoice_url: inv.invoice_url ?? null,
      invoice_paid: true,
      invoice_attempts: attempts,
      invoice_error: null,
    });
    return "issued";
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[invoice] ${claimed.order_no}: ${message}`);
    await save({ invoice_status: "failed", invoice_attempts: attempts, invoice_error: message.slice(0, 400) });
    return "failed";
  }
}

// Delivered orders still without an invoice (failed, never tried, or stuck): for the daily retry.
export async function ordersNeedingInvoice(limit = 10): Promise<string[]> {
  const db = getAdminClient();
  if (!db) return [];
  const stale = new Date(Date.now() - STALE_MS).toISOString();
  const { data } = await db
    .from("orders")
    .select("id")
    .eq("status", "delivered_cash_collected")
    .lt("invoice_attempts", 8)
    .or(`invoice_status.in.(none,failed),and(invoice_status.eq.pending,invoice_tried_at.lt.${stale})`)
    .order("status_changed_at")
    .limit(limit);
  return (data ?? []).map((r) => r.id as string);
}
