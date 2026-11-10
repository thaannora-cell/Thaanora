"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/admin/session";
import { canOpen } from "@/lib/admin/sections";
import { getSessionClient } from "@/lib/supabase/server";
import { isStatus } from "@/lib/admin/orders";

export type OrderResult = { ok: true } | { ok: false; error: "forbidden" | "notFound" | "noStock" | "saveFailed" | "invalid"; detail?: string };

async function ordersClient() {
  const session = await getSession();
  if (session.state !== "staff" || !canOpen(session.staff.role, "orders")) return null;
  return getSessionClient();
}

// Changing the status is all it takes: the database stamps the time, takes stock off when an order
// is confirmed (or later), and puts it back on Cancelled / Refused at door. If a suit doesn't have enough
// stock, the database refuses the change and nothing is saved.
export async function setOrderStatus(orderId: string, status: string): Promise<OrderResult> {
  const supabase = await ordersClient();
  if (!supabase) return { ok: false, error: "forbidden" };
  if (!isStatus(status)) return { ok: false, error: "invalid" };
  const { data, error } = await supabase.from("orders").update({ status }).eq("id", orderId).select("order_no").maybeSingle();
  if (error) {
    if (error.code === "23514") {
      const { data: items } = await supabase.from("order_items").select("product_name").eq("order_id", orderId);
      return { ok: false, error: "noStock", detail: (items ?? []).map((i) => i.product_name).join(", ") };
    }
    return { ok: false, error: "saveFailed" };
  }
  if (!data) return { ok: false, error: "notFound" };
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${data.order_no}`);
  revalidatePath("/admin");
  return { ok: true };
}

const clean = (v: FormDataEntryValue | null, max: number) =>
  typeof v === "string" ? v.trim().replace(/[\u0000-\u001f]/g, " ").slice(0, max) || null : null;

export type DeliveryState = { result?: OrderResult; at?: number };

export async function saveDelivery(_prev: DeliveryState, form: FormData): Promise<DeliveryState> {
  const supabase = await ordersClient();
  if (!supabase) return { result: { ok: false, error: "forbidden" }, at: Date.now() };
  const orderId = String(form.get("orderId") ?? "");
  const tracking = clean(form.get("trackingNo"), 40);
  if (tracking && !/^[\p{L}\p{N}\- ./#]+$/u.test(tracking)) return { result: { ok: false, error: "invalid" }, at: Date.now() };
  const { data, error } = await supabase
    .from("orders")
    .update({ courier: clean(form.get("courier"), 40), tracking_no: tracking, notes: clean(form.get("notes"), 1000) })
    .eq("id", orderId)
    .select("order_no")
    .maybeSingle();
  if (error) return { result: { ok: false, error: "saveFailed" }, at: Date.now() };
  if (!data) return { result: { ok: false, error: "notFound" }, at: Date.now() };
  revalidatePath(`/admin/orders/${data.order_no}`);
  revalidatePath("/admin/orders");
  return { result: { ok: true }, at: Date.now() };
}
