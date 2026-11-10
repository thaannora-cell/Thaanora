"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/admin/session";
import { canOpen } from "@/lib/admin/sections";
import { getSessionClient } from "@/lib/supabase/server";
import { CODE_PATTERN } from "@/lib/discounts";
import { dayEnd, todayInRiyadh } from "@/lib/admin/offers";

export type FormResult = { ok?: boolean; error?: string; message?: string; at?: number };

async function ownerClient() {
  const session = await getSession();
  if (session.state !== "staff" || !canOpen(session.staff.role, "offers")) return null;
  return getSessionClient();
}
const done = (message: string, args: Record<string, string | number> = {}): FormResult => ({ ok: true, message: JSON.stringify([message, args]), at: Date.now() });
const fail = (error: string): FormResult => ({ ok: false, error, at: Date.now() });
const refresh = () => {
  revalidatePath("/admin/offers");
  revalidatePath("/", "layout"); // website prices and bag totals use these offers
};
const int = (v: FormDataEntryValue | null) => {
  const n = Number(String(v ?? "").trim());
  return Number.isInteger(n) ? n : NaN;
};

// Buy several suits, get a discount. One bundle rule; switching it off keeps the numbers for next time.
export async function saveBundle(_p: FormResult, form: FormData): Promise<FormResult> {
  const supabase = await ownerClient();
  if (!supabase) return fail("forbidden");
  const active = form.get("active") === "on";
  const qty = int(form.get("qty"));
  const pct = int(form.get("pct"));
  if (!(qty >= 2 && qty <= 20)) return fail("bundleQty");
  if (!(pct >= 1 && pct <= 50)) return fail("bundlePct");
  const { data: rows } = await supabase.from("offers").select("id, active").eq("kind", "bundle").order("active", { ascending: false });
  const keep = rows?.[0];
  if (rows && rows.length > 1) await supabase.from("offers").delete().in("id", rows.slice(1).map((r) => r.id));
  const { error } = keep
    ? await supabase.from("offers").update({ min_qty: qty, percent: pct, active }).eq("id", keep.id)
    : await supabase.from("offers").insert({ kind: "bundle", min_qty: qty, percent: pct, active });
  if (error) return fail("saveFailed");
  refresh();
  return done(active ? "bundleOn" : "bundleOff", { qty, pct });
}

// Sets the same sale % on every suit of one brand (0 ends the sale).
export async function saveBrandSale(_p: FormResult, form: FormData): Promise<FormResult> {
  const supabase = await ownerClient();
  if (!supabase) return fail("forbidden");
  const brand = String(form.get("brand") ?? "").trim();
  const pct = int(form.get("pct"));
  if (!brand) return fail("chooseBrand");
  if (!(pct >= 0 && pct <= 90)) return fail("salePct");
  const { error, count } = await supabase.from("products").update({ sale_pct: pct }, { count: "exact" }).eq("brand", brand);
  if (error) return fail("saveFailed");
  revalidatePath("/admin/products");
  refresh();
  return done(pct ? "brandSaleOn" : "brandSaleOff", { brand, pct, count: count ?? 0 });
}

export async function addCode(_p: FormResult, form: FormData): Promise<FormResult> {
  const supabase = await ownerClient();
  if (!supabase) return fail("forbidden");
  const code = String(form.get("code") ?? "").trim().toUpperCase();
  const pct = int(form.get("pct"));
  const note = String(form.get("note") ?? "").trim().slice(0, 80) || null;
  const endDay = String(form.get("endDay") ?? "").trim();
  const limitText = String(form.get("limit") ?? "").trim();
  const limit = limitText ? int(limitText) : null;
  if (!CODE_PATTERN.test(code)) return fail("codeFormat");
  if (!(pct >= 1 && pct <= 90)) return fail("codePct");
  if (endDay && (!dayEnd(endDay) || endDay < todayInRiyadh())) return fail("endDate");
  if (limit !== null && !(limit >= 1 && limit <= 100000)) return fail("limit");
  const { error } = await supabase.from("offers").insert({
    kind: "code",
    code,
    percent: pct,
    note,
    active: true,
    ends_at: endDay ? dayEnd(endDay) : null,
    usage_limit: limit,
  });
  if (error) return fail(error.code === "23505" ? "codeTaken" : "saveFailed");
  refresh();
  return done("codeAdded", { code });
}

export async function setCodeActive(id: string, active: boolean): Promise<FormResult> {
  const supabase = await ownerClient();
  if (!supabase) return fail("forbidden");
  const { error, count } = await supabase.from("offers").update({ active: Boolean(active) }, { count: "exact" }).eq("id", id).eq("kind", "code");
  if (error || !count) return fail("saveFailed");
  refresh();
  return { ok: true, at: Date.now() };
}

// Orders keep the code's text, so removing a code never changes past orders.
export async function removeCode(id: string): Promise<FormResult> {
  const supabase = await ownerClient();
  if (!supabase) return fail("forbidden");
  const { error, count } = await supabase.from("offers").delete({ count: "exact" }).eq("id", id).eq("kind", "code");
  if (error || !count) return fail("saveFailed");
  refresh();
  return { ok: true, at: Date.now() };
}
