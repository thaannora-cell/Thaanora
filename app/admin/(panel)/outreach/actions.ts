"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { getSession } from "@/lib/admin/session";
import { canOpen } from "@/lib/admin/sections";
import { getAdminClient } from "@/lib/supabase/admin";
import { getSessionClient } from "@/lib/supabase/server";
import { isSegment, segmentCustomers } from "@/lib/admin/outreach";

const LANGS = ["en", "ar", "ur", "hi"] as const;
const clean = (v: FormDataEntryValue | null, max: number) => String(v ?? "").trim().replace(/[ \t]+/g, " ").slice(0, max);

async function owner() {
  const session = await getSession();
  return session.state === "staff" && canOpen(session.staff.role, "outreach");
}

// How many customers a segment reaches right now (before sending).
export async function previewSegment(segment: string, value: string): Promise<{ count: number } | { error: string }> {
  if (!(await owner())) return { error: "forbidden" };
  if (!isSegment(segment)) return { error: "segment" };
  return { count: (await segmentCustomers(segment, value || null)).length };
}

export type SendResult = { ok: true; count: number } | { ok: false; error: "forbidden" | "segment" | "title" | "percent" | "days" | "nobody" | "failed" };

// Send an announcement, or give a personal offer, to everyone in a segment. Each customer gets an in-site
// notification (and a WhatsApp-list item if she chose that); an offer also lands in her bag automatically
// (one best discount rule) and on her Circle & offers page.
export async function sendOutreach(_prev: SendResult | null, form: FormData): Promise<SendResult> {
  if (!(await owner())) return { ok: false, error: "forbidden" };
  const kind = form.get("kind") === "offer" ? "offer" : "announcement";
  const segment = String(form.get("segment") ?? "");
  const value = clean(form.get("segmentValue"), 80) || null;
  if (!isSegment(segment) || (["level", "brand", "customer"].includes(segment) && !value)) return { ok: false, error: "segment" };

  const title: Record<string, string> = {};
  const body: Record<string, string> = {};
  for (const l of LANGS) {
    const tt = clean(form.get(`title_${l}`), 120);
    const bb = clean(form.get(`body_${l}`), 600);
    if (tt) title[l] = tt;
    if (bb) body[l] = bb;
  }
  if (!title.en) return { ok: false, error: "title" };

  let percent: number | null = null;
  let endsAt: string | null = null;
  if (kind === "offer") {
    percent = Number(form.get("percent"));
    if (!Number.isInteger(percent) || percent < 1 || percent > 50) return { ok: false, error: "percent" };
    const days = Number(form.get("days"));
    if (!Number.isInteger(days) || days < 1 || days > 365) return { ok: false, error: "days" };
    endsAt = new Date(Date.now() + days * 86400000).toISOString();
  }

  const ids = await segmentCustomers(segment, value);
  if (!ids.length) return { ok: false, error: "nobody" };
  const db = getAdminClient();
  if (!db) return { ok: false, error: "failed" };
  // Who sent it (the signed-in owner), for the log.
  const by = (await (await getSessionClient()).auth.getUser()).data.user?.id ?? null;

  const { data: log, error } = await db
    .from("outreach")
    .insert({ kind, segment, segment_value: value, title, body, percent, ends_at: endsAt, recipients: ids.length, created_by: by })
    .select("id")
    .single();
  if (error || !log) {
    console.error("[outreach] log failed:", error?.message);
    return { ok: false, error: "failed" };
  }

  // The notification carries the words in every language we have (the site shows hers, else English).
  const data: Record<string, string> = { outreachId: log.id };
  for (const l of LANGS) {
    if (title[l]) data[`title_${l}`] = title[l];
    if (body[l]) data[`body_${l}`] = body[l];
  }
  if (kind === "offer") {
    const rows = ids.map((customer_id) => ({ customer_id, percent, title, ends_at: endsAt, outreach_id: log.id, created_by: by }));
    const made = await db.from("customer_offers").insert(rows);
    if (made.error) {
      console.error("[outreach] offers failed:", made.error.message);
      await db.from("outreach").update({ recipients: 0 }).eq("id", log.id);
      return { ok: false, error: "failed" };
    }
    // When there's no text of her own, say what the offer is, in each language.
    for (const l of LANGS) {
      if (data[`body_${l}`]) continue;
      const t = await getTranslations({ locale: l, namespace: "Circle" });
      const until = new Intl.DateTimeFormat(`${l}-u-ca-gregory`, { day: "numeric", month: "long", timeZone: "Asia/Riyadh" }).format(new Date(endsAt!));
      data[`body_${l}`] = t("offerNotice", { pct: percent!, date: until });
    }
  }
  const sent = await db.rpc("notify_many", { p_customers: ids, p_type: kind === "offer" ? "new_offer" : "announcement", p_data: data });
  if (sent.error) console.error("[outreach] notify failed:", sent.error.message);
  revalidatePath("/admin/outreach");
  return { ok: true, count: ids.length };
}
