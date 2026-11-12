import "server-only";
import { getAdminClient } from "@/lib/supabase/admin";

export type MyOrder = { orderNo: string; status: string; createdAt: string; updatedAt: string; total: number; suits: number };

// The customer's own orders, newest first. Only call with the id from getAccount() (the session),
// never with an id that came from the browser. Safe columns only: no costs, no staff notes.
export async function myOrders(customerId: string, limit = 1): Promise<MyOrder[]> {
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
