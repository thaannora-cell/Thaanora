import "server-only";
import { getAdminClient } from "@/lib/supabase/admin";
import { getPublicClient } from "@/lib/supabase/public";
import type { ReturnStatus } from "@/lib/returns";

export type ReturnableItem = { id: string; code: string; name: string; unitPrice: number; qty: number };
export type MyReturn = {
  returnNo: string;
  status: ReturnStatus;
  resolution: "refund" | "exchange";
  reason: string;
  refund: number;
  includesDelivery: boolean;
  createdAt: string;
  updatedAt: string;
  items: { name: string; code: string; qty: number }[];
};
export type ReturnableOrder = {
  orderId: string;
  orderNo: string;
  delivered: boolean;
  windowEnds: string | null; // when she can no longer ask (ISO)
  open: boolean; // she can ask for a return now
  items: ReturnableItem[];
  discount: number;
  deliveryFee: number;
  packagingFee: number;
  existing: MyReturn | null;
};

export async function returnWindowDays(): Promise<number> {
  const db = getPublicClient();
  if (!db) return 3;
  const { data } = await db.from("settings").select("value").eq("key", "return_window_days").maybeSingle();
  const n = Number(data?.value);
  return Number.isInteger(n) && n >= 0 && n <= 30 ? n : 3;
}

// Only ever call with the customer id from getAccount() (her session).
export async function returnableOrder(customerId: string, orderNo: string): Promise<ReturnableOrder | null> {
  if (!/^TH-\d{3,7}$/.test(orderNo)) return null;
  const db = getAdminClient();
  if (!db) return null;
  const { data: o } = await db
    .from("orders")
    .select("id, order_no, status, status_changed_at, bundle_discount_sar, code_discount_sar, perk_discount_sar, delivery_fee_sar, packaging_fee_sar, order_items (id, product_code, product_name, unit_price_sar, qty, created_at)")
    .eq("order_no", orderNo)
    .eq("customer_id", customerId)
    .maybeSingle();
  if (!o) return null;
  const days = await returnWindowDays();
  const delivered = o.status === "delivered_cash_collected";
  const windowEnds = delivered ? new Date(Date.parse(o.status_changed_at) + days * 86400000).toISOString() : null;
  const existing = await myReturnForOrder(o.id);
  type Item = { id: string; product_code: string; product_name: string; unit_price_sar: number; qty: number; created_at: string };
  const items = ((o.order_items ?? []) as Item[]).sort((a, b) => a.created_at.localeCompare(b.created_at));
  const live = existing && !["rejected", "cancelled"].includes(existing.status);
  return {
    orderId: o.id,
    orderNo: o.order_no,
    delivered,
    windowEnds,
    open: delivered && !live && windowEnds !== null && Date.parse(windowEnds) > Date.now(),
    items: items.map((i) => ({ id: i.id, code: i.product_code, name: i.product_name, unitPrice: Number(i.unit_price_sar), qty: i.qty })),
    discount: Number(o.bundle_discount_sar) + Number(o.code_discount_sar) + Number(o.perk_discount_sar ?? 0),
    deliveryFee: Number(o.delivery_fee_sar),
    packagingFee: Number(o.packaging_fee_sar),
    existing,
  };
}

// Her latest return for an order (any status), or null.
export async function myReturnForOrder(orderId: string): Promise<MyReturn | null> {
  const db = getAdminClient();
  if (!db) return null;
  const { data: r } = await db
    .from("returns")
    .select("return_no, status, resolution, reason, refund_sar, includes_delivery, created_at, status_changed_at, return_items (qty, order_items (product_code, product_name))")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!r) return null;
  type RI = { qty: number; order_items: { product_code: string; product_name: string } | null };
  return {
    returnNo: r.return_no,
    status: r.status,
    resolution: r.resolution,
    reason: r.reason,
    refund: Number(r.refund_sar),
    includesDelivery: r.includes_delivery,
    createdAt: r.created_at,
    updatedAt: r.status_changed_at,
    items: ((r.return_items ?? []) as unknown as RI[]).map((x) => ({ qty: x.qty, code: x.order_items?.product_code ?? "", name: x.order_items?.product_name ?? "" })),
  };
}
