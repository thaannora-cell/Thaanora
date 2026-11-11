import "server-only";
import { getSessionClient } from "@/lib/supabase/server";
import type { OrderStatus } from "./dashboard";

export const STATUSES: OrderStatus[] = [
  "waiting_confirmation",
  "confirmed",
  "packed",
  "with_courier",
  "delivered_cash_collected",
  "refused_at_door",
  "cancelled",
];
export const isStatus = (s: string): s is OrderStatus => (STATUSES as string[]).includes(s);

// The usual next steps from each status. Any status can still be chosen from "Change status" to correct a mistake;
// the database moves stock for every change (held from Confirmed on, returned on Cancelled / Refused).
export const NEXT: Record<OrderStatus, OrderStatus[]> = {
  waiting_confirmation: ["confirmed", "cancelled"],
  confirmed: ["packed", "cancelled"],
  packed: ["with_courier", "cancelled"],
  with_courier: ["delivered_cash_collected", "refused_at_door"],
  delivered_cash_collected: [],
  refused_at_door: [],
  cancelled: [],
};

export const COURIERS = ["SMSA", "Aramex", "J&T Express", "SPL", "Local courier"];

export type OrderListItem = {
  id: string;
  orderNo: string;
  createdAt: string;
  customer: string;
  area: string;
  total: number;
  status: OrderStatus;
  courier: string | null;
  trackingNo: string | null;
  suits: { name: string; qty: number }[];
};

export type OrderDetail = OrderListItem & {
  phone: string;
  language: "en" | "ar" | "ur" | "hi";
  address: string | null;
  packaging: "suit_keeper_bag" | "gift_box";
  isGift: boolean;
  giftNote: string | null;
  recipientName: string | null;
  recipientArea: string | null;
  discountCode: string | null;
  subtotal: number;
  bundleDiscount: number;
  codeDiscount: number;
  packagingFee: number;
  deliveryFee: number;
  vat: number;
  notes: string | null;
  statusChangedAt: string;
  items: { id: string; code: string; name: string; unitPrice: number; qty: number; stitching: boolean }[];
  invoice: { status: "none" | "pending" | "issued" | "failed"; no: string | null; url: string | null; hasPdf: boolean; error: string | null; attempts: number; triedAt: string | null };
};

const LIST_COLUMNS = "id, order_no, created_at, customer_name, area, total_sar, status, courier, tracking_no, order_items (product_name, qty)";

type Row = Record<string, unknown> & { order_items?: { product_name: string; qty: number }[] };
const toItem = (o: Row): OrderListItem => ({
  id: o.id as string,
  orderNo: o.order_no as string,
  createdAt: o.created_at as string,
  customer: o.customer_name as string,
  area: o.area as string,
  total: Number(o.total_sar),
  status: o.status as OrderStatus,
  courier: (o.courier as string | null) ?? null,
  trackingNo: (o.tracking_no as string | null) ?? null,
  suits: (o.order_items ?? []).map((i) => ({ name: i.product_name, qty: i.qty })),
});

// Read as the signed-in person (RLS: owner and orders team). Search matches order no., name or phone.
export async function listOrders(status: OrderStatus | null, query: string) {
  const supabase = await getSessionClient();
  let q = supabase.from("orders").select(LIST_COLUMNS).order("created_at", { ascending: false }).limit(200);
  if (status) q = q.eq("status", status);
  const term = query.replace(/[^\p{L}\p{N}+\- ]/gu, "").trim().slice(0, 40);
  if (term) {
    const digits = term.replace(/\D/g, "");
    const parts = [`order_no.ilike.%${term}%`, `customer_name.ilike.%${term}%`];
    if (digits.length >= 4) parts.push(`customer_phone.ilike.%${digits.slice(-9)}%`);
    q = q.or(parts.join(","));
  }
  const [orders, counts] = await Promise.all([q, supabase.from("orders").select("status")]);
  const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<OrderStatus, number>;
  for (const r of counts.data ?? []) byStatus[r.status as OrderStatus]++;
  return {
    orders: ((orders.data ?? []) as Row[]).map(toItem),
    counts: byStatus,
    total: counts.data?.length ?? 0,
    failed: Boolean(orders.error || counts.error),
  };
}

export async function getOrder(orderNo: string): Promise<OrderDetail | null> {
  const supabase = await getSessionClient();
  const INVOICE = "invoice_status, invoice_no, invoice_url, invoice_zoho_id, invoice_error, invoice_attempts, invoice_tried_at, ";
  const BASE = "id, order_no, created_at, status_changed_at, customer_name, customer_phone, language, area, address, packaging, is_gift, gift_note, recipient_name, recipient_area, discount_code, subtotal_sar, bundle_discount_sar, code_discount_sar, packaging_fee_sar, delivery_fee_sar, total_sar, vat_sar, status, courier, tracking_no, notes, order_items (id, product_code, product_name, unit_price_sar, qty, wants_stitching)";
  const read = (cols: string) => supabase.from("orders").select(cols).eq("order_no", orderNo).maybeSingle();
  let res = await read(INVOICE + BASE);
  // Before the invoices migration runs, the invoice columns don't exist yet: show the order without them.
  if (res.error?.code === "42703") res = await read(BASE);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const o = res.data as any;
  if (!o) return null;
  type Item = { id: string; product_code: string; product_name: string; unit_price_sar: number; qty: number; wants_stitching: boolean };
  const items = (o.order_items ?? []) as Item[];
  return {
    ...toItem({ ...o, order_items: items.map((i) => ({ product_name: i.product_name, qty: i.qty })) }),
    phone: o.customer_phone,
    language: o.language,
    address: o.address,
    packaging: o.packaging,
    isGift: o.is_gift,
    giftNote: o.gift_note,
    recipientName: o.recipient_name,
    recipientArea: o.recipient_area,
    discountCode: o.discount_code,
    subtotal: Number(o.subtotal_sar),
    bundleDiscount: Number(o.bundle_discount_sar),
    codeDiscount: Number(o.code_discount_sar),
    packagingFee: Number(o.packaging_fee_sar),
    deliveryFee: Number(o.delivery_fee_sar),
    invoice: {
      status: o.invoice_status ?? "none",
      no: o.invoice_no ?? null,
      // Only Zoho's own https links are kept as the customer link.
      url: typeof o.invoice_url === "string" && /^https:\/\/[^/]*\.zoho(apis)?\.[a-z.]+\//i.test(o.invoice_url) ? o.invoice_url : null,
      hasPdf: Boolean(o.invoice_zoho_id),
      error: o.invoice_error ?? null,
      attempts: o.invoice_attempts ?? 0,
      triedAt: o.invoice_tried_at ?? null,
    },
    vat: Number(o.vat_sar),
    notes: o.notes,
    statusChangedAt: o.status_changed_at,
    items: items.map((i) => ({ id: i.id, code: i.product_code, name: i.product_name, unitPrice: Number(i.unit_price_sar), qty: i.qty, stitching: i.wants_stitching })),
  };
}
