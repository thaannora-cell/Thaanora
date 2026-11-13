import "server-only";
import { getSessionClient } from "@/lib/supabase/server";
import { RETURN_STATUSES, isReason, type ReturnReason, type ReturnStatus } from "@/lib/returns";

export const isReturnStatus = (v: unknown): v is ReturnStatus => typeof v === "string" && (RETURN_STATUSES as readonly string[]).includes(v);

export type ReturnListRow = {
  id: string;
  returnNo: string;
  orderNo: string;
  customer: string;
  status: ReturnStatus;
  resolution: "refund" | "exchange";
  reason: ReturnReason;
  refund: number;
  createdAt: string;
  zohoProblem: boolean;
};

export type ReturnDetail = ReturnListRow & {
  orderId: string;
  phone: string;
  language: "en" | "ar" | "ur" | "hi";
  details: string | null;
  staffNote: string | null;
  includesDelivery: boolean;
  invoiceNo: string | null;
  invoiceIssued: boolean;
  deliveredAt: string;
  items: { code: string; name: string; qty: number; unitPrice: number }[];
  exchangeOrderNo: string | null;
  creditNoteStatus: "none" | "pending" | "issued" | "failed";
  creditNoteNo: string | null;
  refundRecorded: boolean;
  creditApplied: boolean;
  zohoError: string | null;
};

// Read as the signed-in staff member (RLS: owner and orders team).
export async function listReturns(status: ReturnStatus | null): Promise<{ rows: ReturnListRow[]; counts: Record<ReturnStatus, number>; failed: boolean }> {
  const supabase = await getSessionClient();
  let q = supabase
    .from("returns")
    .select("id, return_no, status, resolution, reason, refund_sar, created_at, credit_note_status, refund_recorded, resolution, zoho_error, orders!returns_order_id_fkey (order_no, customer_name)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (status) q = q.eq("status", status);
  const [list, all] = await Promise.all([q, supabase.from("returns").select("status")]);
  const counts = Object.fromEntries(RETURN_STATUSES.map((s) => [s, 0])) as Record<ReturnStatus, number>;
  for (const r of all.data ?? []) if (isReturnStatus(r.status)) counts[r.status]++;
  type Row = { id: string; return_no: string; status: ReturnStatus; resolution: "refund" | "exchange"; reason: string; refund_sar: number; created_at: string; credit_note_status: string; refund_recorded: boolean; zoho_error: string | null; orders: { order_no: string; customer_name: string } | null };
  return {
    rows: ((list.data ?? []) as unknown as Row[]).map((r) => ({
      id: r.id,
      returnNo: r.return_no,
      orderNo: r.orders?.order_no ?? "",
      customer: r.orders?.customer_name ?? "",
      status: r.status,
      resolution: r.resolution,
      reason: isReason(r.reason) ? r.reason : "other",
      refund: Number(r.refund_sar),
      createdAt: r.created_at,
      zohoProblem: r.credit_note_status === "failed" || Boolean(r.zoho_error) || (r.status === "refunded" && !r.refund_recorded),
    })),
    counts,
    failed: Boolean(list.error),
  };
}

export async function getReturn(id: string): Promise<ReturnDetail | null> {
  const supabase = await getSessionClient();
  const { data: r } = await supabase
    .from("returns")
    .select(
      "id, return_no, order_id, status, resolution, reason, details, staff_note, refund_sar, includes_delivery, created_at, credit_note_status, credit_note_no, refund_recorded, credit_applied, zoho_error, exchange_order_id, orders!returns_order_id_fkey (order_no, customer_name, customer_phone, language, invoice_no, invoice_status, status_changed_at), return_items (qty, order_items (product_code, product_name, unit_price_sar))",
    )
    .eq("id", id)
    .maybeSingle();
  if (!r) return null;
  type O = { order_no: string; customer_name: string; customer_phone: string; language: "en" | "ar" | "ur" | "hi"; invoice_no: string | null; invoice_status: string; status_changed_at: string };
  type RI = { qty: number; order_items: { product_code: string; product_name: string; unit_price_sar: number } | null };
  const o = r.orders as unknown as O | null;
  let exchangeOrderNo: string | null = null;
  if (r.exchange_order_id) {
    const { data: x } = await supabase.from("orders").select("order_no").eq("id", r.exchange_order_id).maybeSingle();
    exchangeOrderNo = x?.order_no ?? null;
  }
  return {
    id: r.id,
    returnNo: r.return_no,
    orderId: r.order_id,
    orderNo: o?.order_no ?? "",
    customer: o?.customer_name ?? "",
    phone: o?.customer_phone ?? "",
    language: o?.language ?? "en",
    status: r.status,
    resolution: r.resolution,
    reason: isReason(r.reason) ? r.reason : "other",
    details: r.details,
    staffNote: r.staff_note,
    refund: Number(r.refund_sar),
    includesDelivery: r.includes_delivery,
    createdAt: r.created_at,
    invoiceNo: o?.invoice_no ?? null,
    invoiceIssued: o?.invoice_status === "issued",
    deliveredAt: o?.status_changed_at ?? r.created_at,
    items: ((r.return_items ?? []) as unknown as RI[]).map((x) => ({ qty: x.qty, code: x.order_items?.product_code ?? "", name: x.order_items?.product_name ?? "", unitPrice: Number(x.order_items?.unit_price_sar ?? 0) })),
    exchangeOrderNo,
    creditNoteStatus: r.credit_note_status,
    creditNoteNo: r.credit_note_no,
    refundRecorded: r.refund_recorded,
    creditApplied: r.credit_applied,
    zohoError: r.zoho_error,
    zohoProblem: r.credit_note_status === "failed" || Boolean(r.zoho_error),
  };
}
