"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAdminClient } from "@/lib/supabase/admin";
import { getSessionClient } from "@/lib/supabase/server";
import { getAccount } from "@/lib/customer/account";
import { allow } from "@/lib/rate-limit";
import { isLocale } from "@/lib/site-gate";
import { returnableOrder } from "@/lib/customer/returns";
import { computeRefund, isReason, isResolution, OUR_FAULT } from "@/lib/returns";
import { reviewableSuits } from "@/lib/customer/reviews";

const loc = (v: FormDataEntryValue | null) => (isLocale(v) ? v : "en");
const text = (v: FormDataEntryValue | null, max: number) => String(v ?? "").trim().replace(/\s+/g, " ").slice(0, max);

// ── Returns ─────────────────────────────────────────────────────────────────
export type ReturnFormState = { error?: "items" | "reason" | "resolution" | "confirm" | "closed" | "tooMany" | "failed" | "signedOut"; at?: number };

// She asks to return suits from a delivered order (within the return window). The refund is worked
// out here from the order, never taken from the browser.
export async function requestReturn(_prev: ReturnFormState, form: FormData): Promise<ReturnFormState> {
  const account = await getAccount();
  if (account.state !== "customer") return { error: "signedOut", at: Date.now() };
  const locale = loc(form.get("locale"));
  const orderNo = text(form.get("orderNo"), 12).toUpperCase();
  const order = await returnableOrder(account.customer.id, orderNo);
  if (!order || !order.open) return { error: "closed", at: Date.now() };

  const reason = form.get("reason");
  const resolution = form.get("resolution");
  if (!isReason(reason)) return { error: "reason", at: Date.now() };
  if (!isResolution(resolution)) return { error: "resolution", at: Date.now() };
  if (form.get("confirm") !== "on") return { error: "confirm", at: Date.now() };
  const returning = order.items.map((i) => ({ orderItemId: i.id, qty: Math.min(Math.max(0, Math.floor(Number(form.get(`qty_${i.id}`)) || 0)), i.qty) })).filter((x) => x.qty > 0);
  if (!returning.length) return { error: "items", at: Date.now() };
  if (!(await allow(await headers(), "returns"))) return { error: "tooMany", at: Date.now() };

  const refund = computeRefund(order, returning, reason);
  const db = getAdminClient();
  if (!db) return { error: "failed", at: Date.now() };
  const { data: made, error } = await db
    .from("returns")
    .insert({
      order_id: order.orderId,
      customer_id: account.customer.id,
      resolution,
      reason,
      details: text(form.get("details"), 600) || null,
      refund_sar: refund.total,
      includes_delivery: OUR_FAULT.includes(reason),
    })
    .select("id")
    .single();
  if (error || !made) {
    console.error("[returns] not created:", error?.code, error?.message);
    return { error: /window|delivered/.test(error?.message ?? "") || error?.code === "23505" ? "closed" : "failed", at: Date.now() };
  }
  const items = await db.from("return_items").insert(refund.lines.map((l) => ({ return_id: made.id, order_item_id: l.orderItemId, qty: l.qty })));
  if (items.error) {
    await db.from("returns").delete().eq("id", made.id);
    return { error: "failed", at: Date.now() };
  }
  revalidatePath(`/${locale}/account/orders/${orderNo}`);
  redirect(`/${locale}/account/orders/${orderNo}?return=sent`);
}

// She withdraws her request while we haven't looked at it yet.
export async function cancelMyReturn(orderNo: string, locale: string): Promise<{ ok: boolean }> {
  const account = await getAccount();
  if (account.state !== "customer") return { ok: false };
  const order = await returnableOrder(account.customer.id, String(orderNo).toUpperCase());
  const db = getAdminClient();
  if (!order || !db) return { ok: false };
  const { count } = await db
    .from("returns")
    .update({ status: "cancelled" }, { count: "exact" })
    .eq("order_id", order.orderId)
    .eq("customer_id", account.customer.id)
    .eq("status", "requested");
  revalidatePath(`/${isLocale(locale) ? locale : "en"}/account/orders/${order.orderNo}`);
  return { ok: Boolean(count) };
}

// ── Reviews ─────────────────────────────────────────────────────────────────
export type ReviewState = { ok?: boolean; error?: "rating" | "notBought" | "tooMany" | "failed" | "signedOut"; code?: string; at?: number };

// Stars + text for a suit she received. It waits for approval before anyone sees it. She can change it
// (it goes back for approval).
export async function saveReview(_prev: ReviewState, form: FormData): Promise<ReviewState> {
  const account = await getAccount();
  const code = text(form.get("code"), 64);
  if (account.state !== "customer") return { error: "signedOut", code, at: Date.now() };
  const rating = Number(form.get("rating"));
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { error: "rating", code, at: Date.now() };
  const suit = (await reviewableSuits(account.customer.id)).find((s) => s.code === code);
  if (!suit) return { error: "notBought", code, at: Date.now() };
  if (!(await allow(await headers(), "reviews"))) return { error: "tooMany", code, at: Date.now() };
  const db = getAdminClient();
  if (!db) return { error: "failed", code, at: Date.now() };
  const parts = account.customer.name.trim().split(/\s+/);
  const author = `${parts[0]}${parts[1] ? ` ${parts[1].charAt(0)}.` : ""}`.slice(0, 40);
  const { error } = await db.from("reviews").upsert(
    {
      product_id: suit.productId,
      customer_id: account.customer.id,
      order_id: suit.orderId,
      rating,
      body: text(form.get("body"), 800),
      author_name: author,
      language: loc(form.get("locale")),
      status: "pending",
    },
    { onConflict: "customer_id,product_id" },
  );
  if (error) {
    console.error("[reviews] not saved:", error.code, error.message);
    return { error: "failed", code, at: Date.now() };
  }
  revalidatePath(`/${loc(form.get("locale"))}/account/reviews`);
  return { ok: true, code, at: Date.now() };
}

// ── Privacy: deactivate my account ───────────────────────────────────────────
// Orders, invoices and returns stay (tax records, 6 years). Everything else that is only about her is
// removed: addresses, saved suits, measurements, tailor, birthday, notifications and settings; her
// reviews are hidden. Then she is signed out. Staff can reactivate the profile if she asks.
export async function deactivateAccount(_prev: { error?: string }, form: FormData): Promise<{ error?: "confirm" | "failed" }> {
  const account = await getAccount();
  const locale = loc(form.get("locale"));
  if (account.state !== "customer") redirect(`/${locale}/account`);
  if (form.get("confirm") !== "on") return { error: "confirm" };
  const db = getAdminClient();
  if (!db) return { error: "failed" };
  const id = account.customer.id;
  const steps = await Promise.all([
    db.from("addresses").delete().eq("customer_id", id),
    db.from("favorites").delete().eq("customer_id", id),
    db.from("notifications").delete().eq("customer_id", id),
    db.from("notification_prefs").delete().eq("customer_id", id),
    db.from("customer_offers").update({ active: false }).eq("customer_id", id),
    db.from("reviews").update({ status: "hidden" }).eq("customer_id", id),
  ]);
  if (steps.some((s) => s.error)) {
    console.error("[privacy] deactivate step failed:", steps.map((s) => s.error?.message).filter(Boolean));
    return { error: "failed" };
  }
  const { error } = await db
    .from("customers")
    .update({ status: "deactivated", birthday: null, measurements: {}, tailor_id: null })
    .eq("id", id)
    .eq("user_id", account.userId);
  if (error) return { error: "failed" };
  const session = await getSessionClient();
  await session.auth.signOut();
  revalidatePath(`/${locale}`, "layout");
  redirect(`/${locale}?account=deactivated`);
}
