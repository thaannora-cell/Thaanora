"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/admin/session";
import { canOpen } from "@/lib/admin/sections";
import { getSessionClient } from "@/lib/supabase/server";
import type { FormResult } from "../offers/actions";
import { allDefaults } from "@/lib/admin/wa-templates";
import { SETTINGS_KEY, TEMPLATE_KINDS, TEMPLATE_LANGS, TEMPLATE_MAX, unknownPlaceholders, type Templates } from "@/lib/wa-templates";

// Which settings the website may read. Private ones (PKR rate, low-stock level) stay staff-only.
const PUBLIC: Record<string, boolean> = {
  whatsapp_number: true,
  social_links: true,
  delivery_fees: true,
  business: true,
  pkr_per_sar: false,
  low_stock_level: false,
  customer_signin_method: true,
  require_signin_to_order: true,
  birthday_gift_pct: true,
  return_window_days: true,
  zoho_refund_account_id: false,
  cod_call_after_refusals: false,
};
const HOSTS = { instagram: "instagram.com", tiktok: "tiktok.com", snapchat: "snapchat.com" } as const;

const fail = (error: string, field?: string): FormResult => ({ ok: false, error, message: field, at: Date.now() });
const text = (v: FormDataEntryValue | null, max: number) => String(v ?? "").trim().replace(/\s+/g, " ").slice(0, max);

// A profile link must be https on the network's own site; empty hides it on the website.
function social(key: keyof typeof HOSTS, raw: string): string | null {
  if (!raw) return "";
  try {
    const u = new URL(raw);
    const host = u.hostname.replace(/^www\./, "");
    const ok = u.protocol === "https:" && (host === HOSTS[key] || host.endsWith(`.${HOSTS[key]}`)) && u.pathname.replace(/\/+$/, "") !== "";
    return ok ? u.toString() : null;
  } catch {
    return null;
  }
}

export async function saveSettings(_p: FormResult, form: FormData): Promise<FormResult> {
  const session = await getSession();
  if (session.state !== "staff" || !canOpen(session.staff.role, "settings")) return fail("forbidden");
  const supabase = await getSessionClient();

  // WhatsApp: + and 8–15 digits (Saudi numbers may be typed as 05…).
  let wa = text(form.get("whatsapp"), 30).replace(/[\s\-().]/g, "");
  if (/^05\d{8}$/.test(wa)) wa = `+966${wa.slice(1)}`;
  if (/^9665\d{8}$/.test(wa)) wa = `+${wa}`;
  if (!/^\+[1-9]\d{7,14}$/.test(wa)) return fail("whatsapp", "whatsapp");

  const links: Record<string, string> = {};
  for (const k of Object.keys(HOSTS) as (keyof typeof HOSTS)[]) {
    const v = social(k, text(form.get(k), 200));
    if (v === null) return fail("social", k);
    links[k] = v;
  }

  const n = Math.min(Number(form.get("feeCount") ?? 0) || 0, 20);
  const fees: { area: string; fee_sar: number }[] = [];
  for (let i = 0; i < n; i++) {
    const area = text(form.get(`fee${i}_area`), 120);
    const feeText = text(form.get(`fee${i}_fee`), 6);
    if (!area && !feeText) continue;
    const fee = Number(feeText);
    if (!area || !(Number.isFinite(fee) && fee >= 0 && fee <= 1000)) return fail("fee", `fee${i}`);
    if (fees.some((f) => f.area.toLowerCase() === area.toLowerCase())) return fail("feeDuplicate", `fee${i}`);
    fees.push({ area, fee_sar: Math.round(fee * 100) / 100 });
  }
  if (fees.length === 0) return fail("feesEmpty");

  const business = {
    legal_name: text(form.get("legalName"), 120),
    entity_type: text(form.get("entityType"), 80),
    national_number: text(form.get("nationalNo"), 40),
    vat_number: text(form.get("vatNo"), 40),
    address: text(form.get("address"), 160),
  };
  if (business.national_number && !/^[0-9A-Za-z\- ]+$/.test(business.national_number)) return fail("nationalNo", "nationalNo");
  if (business.vat_number && !/^\d{15}$/.test(business.vat_number.replace(/\s/g, ""))) return fail("vatNo", "vatNo");

  const rate = Number(text(form.get("pkrRate"), 10));
  if (!(rate > 0 && rate < 1000)) return fail("pkrRate", "pkrRate");
  const low = Number(text(form.get("lowStock"), 4));
  if (!(Number.isInteger(low) && low >= 0 && low <= 100)) return fail("lowStock", "lowStock");

  // Customer sign-in: only the email code works until SMS (Taqnyat) is connected at go-live.
  const SIGNIN_READY = ["email"];
  const method = text(form.get("signinMethod"), 10) || "email";
  if (!["email", "sms", "both"].includes(method)) return fail("signinMethod", "signinMethod");
  if (!SIGNIN_READY.includes(method)) return fail("signinNotReady", "signinMethod");

  // Birthday gift (Thaanora Circle): 0 switches it off.
  const birthdayPct = Number(text(form.get("birthdayPct"), 4));
  if (!(Number.isInteger(birthdayPct) && birthdayPct >= 0 && birthdayPct <= 50)) return fail("birthdayPct", "birthdayPct");

  // Returns: days after delivery; Zoho bank account for refunds (digits, optional).
  const returnDays = Number(text(form.get("returnDays"), 3));
  if (!(Number.isInteger(returnDays) && returnDays >= 0 && returnDays <= 30)) return fail("returnDays", "returnDays");
  const refundAccount = text(form.get("refundAccount"), 30);
  if (refundAccount && !/^\d{5,30}$/.test(refundAccount)) return fail("refundAccount", "refundAccount");

  // COD protection: ask for a call after this many refusals at the door (0 = off).
  const codCallAfter = Number(text(form.get("codCallAfter"), 3));
  if (!(Number.isInteger(codCallAfter) && codCallAfter >= 0 && codCallAfter <= 10)) return fail("codCallAfter", "codCallAfter");

  const values: Record<string, unknown> = {
    whatsapp_number: wa,
    social_links: links,
    delivery_fees: fees,
    business,
    pkr_per_sar: Math.round(rate * 100) / 100,
    low_stock_level: low,
    customer_signin_method: method,
    require_signin_to_order: form.get("requireSignIn") === "on",
    birthday_gift_pct: birthdayPct,
    return_window_days: returnDays,
    zoho_refund_account_id: refundAccount,
    cod_call_after_refusals: codCallAfter,
  };
  for (const [key, value] of Object.entries(values)) {
    const { error, count } = await supabase.from("settings").update({ value }, { count: "exact" }).eq("key", key);
    if (error) return fail("saveFailed");
    if (!count) {
      const ins = await supabase.from("settings").insert({ key, value, is_public: PUBLIC[key] });
      if (ins.error) return fail("saveFailed");
    }
  }
  revalidatePath("/admin", "layout");
  revalidatePath("/", "layout"); // footer, WhatsApp button, delivery fees at checkout
  return { ok: true, message: JSON.stringify(["saved", {}]), at: Date.now() };
}

// WhatsApp message templates (owner only). A template left empty or equal to the built-in text isn't
// stored, so it keeps following the built-in text.
export async function saveTemplates(_p: FormResult, form: FormData): Promise<FormResult> {
  const session = await getSession();
  if (session.state !== "staff" || !canOpen(session.staff.role, "settings")) return fail("forbidden");
  const defaults = await allDefaults();
  const value: Templates = {};
  for (const lang of TEMPLATE_LANGS) {
    for (const kind of TEMPLATE_KINDS) {
      const name = `tpl_${lang}_${kind}`;
      const raw = String(form.get(name) ?? "").replace(/\r\n?/g, "\n").trim();
      if (raw.length > TEMPLATE_MAX) return fail("tplLong", name);
      if (unknownPlaceholders(kind, raw).length) return fail("tplUnknown", name);
      if (raw && raw !== defaults[lang][kind].trim()) (value[lang] ??= {})[kind] = raw;
    }
  }
  const supabase = await getSessionClient();
  const { error } = await supabase.from("settings").upsert({ key: SETTINGS_KEY, value, is_public: false });
  if (error) return fail("saveFailed");
  revalidatePath("/admin", "layout");
  return { ok: true, message: JSON.stringify(["templates", {}]), at: Date.now() };
}
