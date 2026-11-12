import "server-only";
import { getAdminClient } from "@/lib/supabase/admin";
import { safeInvoiceUrl } from "@/lib/invoice-link";

export type MyOrder = { orderNo: string; status: string; createdAt: string; updatedAt: string; total: number; suits: number };

export type MyOrderDetail = MyOrder & {
  area: string;
  packaging: "suit_keeper_bag" | "gift_box";
  isGift: boolean;
  recipientName: string | null;
  discountCode: string | null;
  subtotal: number;
  bundleDiscount: number;
  codeDiscount: number;
  packagingFee: number;
  deliveryFee: number;
  vat: number;
  courier: string | null;
  trackingNo: string | null;
  invoiceNo: string | null;
  invoiceUrl: string | null;
  items: { code: string; name: string; unitPrice: number; qty: number; stitching: boolean; available: number }[];
};

// Only ever call these with the customer id from getAccount() (her session), never one from the browser.
// They read with the secret key and filter by that id; only safe columns are taken (no costs, no staff notes).

export async function myOrders(customerId: string, limit = 50): Promise<MyOrder[]> {
  const db = getAdminClient();
  if (!db) return [];
  const { data } = await db
    .from("orders")
    .select("order_no, status, created_at, status_changed_at, total_sar, order_items (qty)")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((o) => ({
    orderNo: o.order_no,
    status: o.status,
    createdAt: o.created_at,
    updatedAt: o.status_changed_at,
    total: Number(o.total_sar),
    suits: ((o.order_items ?? []) as { qty: number }[]).reduce((n, i) => n + i.qty, 0),
  }));
}

export async function myOrder(customerId: string, orderNo: string): Promise<MyOrderDetail | null> {
  if (!/^TH-\d{3,7}$/.test(orderNo)) return null;
  const db = getAdminClient();
  if (!db) return null;
  const { data: o } = await db
    .from("orders")
    .select(
      "order_no, status, created_at, status_changed_at, area, packaging, is_gift, recipient_name, discount_code, subtotal_sar, bundle_discount_sar, code_discount_sar, packaging_fee_sar, delivery_fee_sar, total_sar, vat_sar, courier, tracking_no, invoice_status, invoice_no, invoice_url, order_items (product_id, product_code, product_name, unit_price_sar, qty, wants_stitching, created_at)",
    )
    .eq("order_no", orderNo)
    .eq("customer_id", customerId)
    .maybeSingle();
  if (!o) return null;

  type Item = { product_id: string | null; product_code: string; product_name: string; unit_price_sar: number; qty: number; wants_stitching: boolean; created_at: string };
  const items = ((o.order_items ?? []) as Item[]).sort((a, b) => a.created_at.localeCompare(b.created_at));
  // What can be ordered again: visible suits still in stock (by code, so a re-added product still counts).
  const codes = items.map((i) => i.product_code);
  const { data: stock } = codes.length
    ? await db.from("products").select("code, stock").in("code", codes).eq("visible", true)
    : { data: [] as { code: string; stock: number }[] };
  const left = new Map((stock ?? []).map((p) => [p.code, Math.max(0, p.stock)]));

  return {
    orderNo: o.order_no,
    status: o.status,
    createdAt: o.created_at,
    updatedAt: o.status_changed_at,
    total: Number(o.total_sar),
    suits: items.reduce((n, i) => n + i.qty, 0),
    area: o.area,
    packaging: o.packaging,
    isGift: o.is_gift,
    recipientName: o.recipient_name,
    discountCode: o.discount_code,
    subtotal: Number(o.subtotal_sar),
    bundleDiscount: Number(o.bundle_discount_sar),
    codeDiscount: Number(o.code_discount_sar),
    packagingFee: Number(o.packaging_fee_sar),
    deliveryFee: Number(o.delivery_fee_sar),
    vat: Number(o.vat_sar),
    courier: o.courier,
    trackingNo: o.tracking_no,
    invoiceNo: o.invoice_status === "issued" ? o.invoice_no : null,
    invoiceUrl: o.invoice_status === "issued" ? safeInvoiceUrl(o.invoice_url) : null,
    items: items.map((i) => ({
      code: i.product_code,
      name: i.product_name,
      unitPrice: Number(i.unit_price_sar),
      qty: i.qty,
      stitching: i.wants_stitching,
      available: left.get(i.product_code) ?? 0,
    })),
  };
}
