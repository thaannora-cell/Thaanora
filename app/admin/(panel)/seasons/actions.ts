"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/admin/session";
import { canOpen } from "@/lib/admin/sections";
import { getSessionClient } from "@/lib/supabase/server";
import { dayEnd, dayStart } from "@/lib/admin/offers";
import type { FormResult } from "../offers/actions";

const OCCASIONS = ["Everyday", "Eid", "Wedding", "Birthday", "Anniversary", "Gifts"];

async function ownerClient() {
  const session = await getSession();
  if (session.state !== "staff" || !canOpen(session.staff.role, "seasons")) return null;
  return getSessionClient();
}
const done = (message: string, args: Record<string, string | number> = {}): FormResult => ({ ok: true, message: JSON.stringify([message, args]), at: Date.now() });
const fail = (error: string): FormResult => ({ ok: false, error, at: Date.now() });
const refresh = () => {
  revalidatePath("/admin/seasons");
  revalidatePath("/", "layout");
};
const text = (v: FormDataEntryValue | null, max: number) => String(v ?? "").trim().replace(/\s+/g, " ").slice(0, max);
const titleFrom = (form: FormData, prefix = "") => ({
  en: text(form.get(`${prefix}en`), 90),
  ar: text(form.get(`${prefix}ar`), 90),
  ur: text(form.get(`${prefix}ur`), 90),
  hi: text(form.get(`${prefix}hi`), 90),
});

// Add or edit a campaign. Its dates switch it on and off; "Live" is the owner's master switch.
export async function saveCampaign(_p: FormResult, form: FormData): Promise<FormResult> {
  const supabase = await ownerClient();
  if (!supabase) return fail("forbidden");
  const id = String(form.get("id") ?? "") || null;
  const title = titleFrom(form);
  const from = String(form.get("from") ?? "");
  const to = String(form.get("to") ?? "");
  const pct = Number(form.get("pct") ?? 0);
  const occasion = String(form.get("occasion") ?? "") || null;
  const active = form.get("active") === "on";
  if (title.en.length < 2) return fail("titleEn");
  if (!from || !to || !dayStart(from) || !dayEnd(to)) return fail("dates");
  if (to < from) return fail("datesOrder");
  if (!(Number.isInteger(pct) && pct >= 0 && pct <= 90)) return fail("campaignPct");
  if (occasion && !OCCASIONS.includes(occasion)) return fail("saveFailed");
  const row = { kind: "campaign" as const, title, percent: pct, occasion, active, starts_at: dayStart(from), ends_at: dayEnd(to) };
  const { error } = id ? await supabase.from("campaigns").update(row).eq("id", id) : await supabase.from("campaigns").insert(row);
  if (error) return fail("saveFailed");
  refresh();
  return done(id ? "campaignSaved" : "campaignAdded", { name: title.en });
}

export async function setCampaignActive(id: string, active: boolean): Promise<FormResult> {
  const supabase = await ownerClient();
  if (!supabase) return fail("forbidden");
  const { error, count } = await supabase.from("campaigns").update({ active: Boolean(active) }, { count: "exact" }).eq("id", id).eq("kind", "campaign");
  if (error || !count) return fail("saveFailed");
  refresh();
  return { ok: true, at: Date.now() };
}

export async function removeCampaign(id: string): Promise<FormResult> {
  const supabase = await ownerClient();
  if (!supabase) return fail("forbidden");
  const { error, count } = await supabase.from("campaigns").delete({ count: "exact" }).eq("id", id).eq("kind", "campaign");
  if (error || !count) return fail("saveFailed");
  refresh();
  return { ok: true, at: Date.now() };
}

// Brand of the month and the rotating top-bar messages (each in up to four languages; English is required).
export async function saveLabels(_p: FormResult, form: FormData): Promise<FormResult> {
  const supabase = await ownerClient();
  if (!supabase) return fail("forbidden");
  const brand = text(form.get("brand"), 80);
  const n = Math.min(Number(form.get("count") ?? 0) || 0, 8);
  const messages = Array.from({ length: n }, (_, i) => titleFrom(form, `m${i}_`)).filter((m) => m.en || m.ar || m.ur || m.hi);
  if (messages.some((m) => !m.en)) return fail("messageEn");

  // Brand of the month: one row, switched off when none is chosen.
  const { data: bom } = await supabase.from("campaigns").select("id").eq("kind", "brand_of_month").order("sort_order");
  const first = bom?.[0];
  const bomRes = first
    ? await supabase.from("campaigns").update({ brand: brand || null, active: Boolean(brand), starts_at: null, ends_at: null }).eq("id", first.id)
    : brand
      ? await supabase.from("campaigns").insert({ kind: "brand_of_month", title: { en: "Brand of the month" }, brand, active: true })
      : { error: null };
  if (bomRes.error) return fail("saveFailed");
  if (bom && bom.length > 1) await supabase.from("campaigns").delete().in("id", bom.slice(1).map((r) => r.id));

  // Top-bar messages: replace the list in the order shown.
  const del = await supabase.from("campaigns").delete().eq("kind", "topbar_message");
  if (del.error) return fail("saveFailed");
  if (messages.length) {
    const ins = await supabase
      .from("campaigns")
      .insert(messages.map((title, i) => ({ kind: "topbar_message" as const, title, active: true, sort_order: (i + 1) * 10 })));
    if (ins.error) return fail("saveFailed");
  }
  refresh();
  return done("labelsSaved", { count: messages.length });
}
