"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/admin/session";
import { canOpen } from "@/lib/admin/sections";
import { getSessionClient } from "@/lib/supabase/server";

export type StockResult = { ok: true; stock: number; name: string; waiting?: number } | { ok: false; error: string };

// Re-checks the role on the server; RLS checks it again in the database.
async function stockClient() {
  const session = await getSession();
  if (session.state !== "staff" || !canOpen(session.staff.role, "stock")) return null;
  return getSessionClient();
}

// Every change is a row in stock_movements; the database trigger applies it to products.stock
// and refuses anything that would take stock below zero.
async function move(productId: string, delta: number, reason: "adjustment" | "receive_shipment", note: string | null): Promise<StockResult> {
  const supabase = await stockClient();
  if (!supabase) return { ok: false, error: "forbidden" };
  const { data: me } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("stock_movements")
    .insert({ product_id: productId, delta, reason, note, created_by: me.user?.id ?? null });
  if (error) return { ok: false, error: error.code === "23514" ? "belowZero" : error.code === "23503" ? "notFound" : "saveFailed" };
  const { data: p } = await supabase.from("products").select("name, stock").eq("id", productId).maybeSingle();
  revalidatePath("/admin/stock");
  return { ok: true, stock: p?.stock ?? 0, name: p?.name ?? "" };
}

export async function adjustStock(productId: string, step: 1 | -1): Promise<StockResult> {
  if (step !== 1 && step !== -1) return { ok: false, error: "saveFailed" };
  return move(productId, step, "adjustment", step > 0 ? "+1 by hand" : "−1 by hand");
}

export type ReceiveState = { result?: StockResult; values?: { productId: string; qty: string; reference: string } };

export async function receiveShipment(_prev: ReceiveState, form: FormData): Promise<ReceiveState> {
  const productId = String(form.get("productId") ?? "");
  const qtyText = String(form.get("qty") ?? "").trim();
  const reference = String(form.get("reference") ?? "").trim().replace(/\s+/g, " ").slice(0, 60);
  const values = { productId, qty: qtyText, reference };
  const qty = Number(qtyText);
  if (!productId) return { values, result: { ok: false, error: "chooseSuit" } };
  if (!Number.isInteger(qty) || qty < 1 || qty > 1000) return { values, result: { ok: false, error: "badQty" } };

  const result = await move(productId, qty, "receive_shipment", reference ? `Shipment ${reference}` : "Shipment");
  if (!result.ok) return { values, result };

  // Customers waiting for this suit (Notify me / pre-order). Only roles that may read requests see a number.
  const supabase = await getSessionClient();
  const { count } = await supabase
    .from("requests")
    .select("id", { count: "exact", head: true })
    .eq("product_id", productId)
    .in("type", ["notify_me", "preorder"])
    .in("status", ["new", "in_progress"]);
  return { result: { ...result, waiting: count ?? 0 }, values: { productId, qty: "", reference: "" } };
}
