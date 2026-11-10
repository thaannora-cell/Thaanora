"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/admin/session";
import { canOpen } from "@/lib/admin/sections";
import { getSessionClient } from "@/lib/supabase/server";
import { normaliseSaudiMobile } from "@/lib/phone";
import type { FormResult } from "../offers/actions";

async function ownerClient() {
  const session = await getSession();
  if (session.state !== "staff" || !canOpen(session.staff.role, "tailors")) return null;
  return getSessionClient();
}
const done = (message: string, args: Record<string, string | number> = {}): FormResult => ({ ok: true, message: JSON.stringify([message, args]), at: Date.now() });
const fail = (error: string): FormResult => ({ ok: false, error, at: Date.now() });
const refresh = () => {
  revalidatePath("/admin/tailors");
  revalidatePath("/", "layout"); // the website's tailor network
};
const text = (v: FormDataEntryValue | null, max: number) => String(v ?? "").trim().replace(/\s+/g, " ").slice(0, max);

// Add or edit a partner tailor. Phone stays staff-only; the website shows name, area and the member discount.
export async function saveTailor(_p: FormResult, form: FormData): Promise<FormResult> {
  const supabase = await ownerClient();
  if (!supabase) return fail("forbidden");
  const id = String(form.get("id") ?? "") || null;
  const name = text(form.get("name"), 80);
  const area = text(form.get("area"), 120);
  const phoneRaw = text(form.get("phone"), 30);
  const pctRaw = text(form.get("pct"), 3);
  const note = text(form.get("note"), 120) || null;
  if (name.length < 2) return fail("name");
  if (!area) return fail("area");
  const phone = phoneRaw ? normaliseSaudiMobile(phoneRaw) : null;
  if (phoneRaw && !phone) return fail("phone");
  const pct = pctRaw === "" ? null : Number(pctRaw);
  if (pct !== null && !(Number.isInteger(pct) && pct >= 0 && pct <= 50)) return fail("pct");
  const row = { name, area, phone, member_pct: pct, member_price_note: note };

  if (id) {
    const { error } = await supabase.from("tailors").update(row).eq("id", id);
    if (error) return fail("saveFailed");
  } else {
    const { data: last } = await supabase.from("tailors").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
    const { error } = await supabase.from("tailors").insert({ ...row, visible: true, sort_order: (last?.sort_order ?? 0) + 10 });
    if (error) return fail("saveFailed");
  }
  refresh();
  return done(id ? "saved" : "added", { name });
}

export async function setTailorVisible(id: string, visible: boolean): Promise<FormResult> {
  const supabase = await ownerClient();
  if (!supabase) return fail("forbidden");
  const { error, count } = await supabase.from("tailors").update({ visible: Boolean(visible) }, { count: "exact" }).eq("id", id);
  if (error || !count) return fail("saveFailed");
  refresh();
  return { ok: true, at: Date.now() };
}

// The shop-wide member discount used for tailors without their own %.
export async function saveDefaultPct(_p: FormResult, form: FormData): Promise<FormResult> {
  const supabase = await ownerClient();
  if (!supabase) return fail("forbidden");
  const pct = Number(form.get("pct"));
  if (!(Number.isInteger(pct) && pct >= 0 && pct <= 50)) return fail("pct");
  const { error, count } = await supabase.from("settings").update({ value: pct }, { count: "exact" }).eq("key", "tailor_member_discount_pct");
  if (error) return fail("saveFailed");
  if (!count) {
    const ins = await supabase.from("settings").insert({ key: "tailor_member_discount_pct", value: pct, is_public: true });
    if (ins.error) return fail("saveFailed");
  }
  refresh();
  return done("defaultSaved", { pct });
}
