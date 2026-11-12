"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSessionClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { getAccount } from "@/lib/customer/account";
import { allow } from "@/lib/rate-limit";
import { siteOrigin } from "@/lib/site-origin";
import { normaliseSaudiMobile } from "@/lib/phone";
import { isLocale } from "@/lib/site-gate";
import { isNotificationType, notificationHref } from "@/lib/notifications";

// ── Sign in with an email code ──────────────────────────────────────────────
export type CustomerSignInState =
  | { step: "email"; error?: "badEmail" | "badLink" | "tooMany" | "failed"; email?: string }
  | { step: "code"; email: string; error?: "badCode" | "tooMany" | "failed"; resent?: boolean };

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const lowerEmail = (v: FormDataEntryValue | null) => (typeof v === "string" ? v.trim().toLowerCase().slice(0, 200) : "");
const tooMany = (e: { status?: number; code?: string } | null) => e?.status === 429 || /rate_limit/.test(e?.code ?? "");
const loc = (v: FormDataEntryValue | null) => (isLocale(v) ? v : "en");

// One action for the whole sign-in: intent = send | resend | verify | back. New emails get an account
// (that's the sign-up); the profile is filled in on the next page.
export async function customerSignIn(_prev: CustomerSignInState, form: FormData): Promise<CustomerSignInState> {
  const intent = String(form.get("intent") ?? "send");
  const locale = loc(form.get("locale"));
  const email = lowerEmail(form.get("email"));
  if (intent === "back") return { step: "email", email };
  if (!EMAIL.test(email)) return { step: "email", error: "badEmail", email };

  const h = await headers();
  if (!(await allow(h, intent === "verify" ? "accountVerify" : "accountSend"))) {
    return intent === "send" ? { step: "email", email, error: "tooMany" } : { step: "code", email, error: "tooMany" };
  }
  const supabase = await getSessionClient();

  if (intent === "verify") {
    const token = String(form.get("code") ?? "").replace(/\D/g, "").slice(0, 10);
    if (token.length < 6) return { step: "code", email, error: "badCode" };
    const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
    if (error) return { step: "code", email, error: tooMany(error) ? "tooMany" : "badCode" };
    redirect(`/${locale}/account`);
  }

  // The email has the 6-digit code (and a link back to this site, which works in the same browser).
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true, emailRedirectTo: `${await siteOrigin()}/${locale}/account/auth/callback` },
  });
  if (error) console.error("[account sign-in] code not sent:", error.status, error.code, error.message);
  if (tooMany(error)) return intent === "resend" ? { step: "code", email, error: "tooMany" } : { step: "email", email, error: "tooMany" };
  if (error) return intent === "resend" ? { step: "code", email, error: "failed" } : { step: "email", email, error: "failed" };
  return { step: "code", email, resent: intent === "resend" };
}

export async function customerSignOut(locale: string) {
  const supabase = await getSessionClient();
  await supabase.auth.signOut();
  redirect(`/${isLocale(locale) ? locale : "en"}`);
}

// ── Profile: name, mobile, language, birthday ───────────────────────────────
export type ProfileState = { ok?: boolean; error?: "name" | "phone" | "birthday" | "failed" | "signedOut"; field?: string; at?: number };

const LANGS = ["en", "ar", "ur", "hi"] as const;

function validBirthday(v: string): string | null | false {
  if (!v) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v) return false;
  if (v < "1920-01-01" || d.getTime() > Date.now()) return false;
  return v;
}

// Creates or updates the signed-in person's profile. Written with the secret key, but only ever for
// the user in the session cookie, so nobody can touch another profile.
export async function saveProfile(_prev: ProfileState, form: FormData): Promise<ProfileState> {
  const account = await getAccount();
  if (account.state === "guest" || account.state === "deactivated") return { error: "signedOut", at: Date.now() };
  const locale = loc(form.get("locale"));
  const name = String(form.get("name") ?? "").trim().replace(/\s+/g, " ").slice(0, 80);
  if (!name) return { error: "name", field: "name", at: Date.now() };
  const phone = normaliseSaudiMobile(String(form.get("phone") ?? ""));
  if (!phone) return { error: "phone", field: "phone", at: Date.now() };
  const langRaw = String(form.get("language") ?? locale);
  const language = (LANGS as readonly string[]).includes(langRaw) ? langRaw : "en";
  const birthday = validBirthday(String(form.get("birthday") ?? "").trim());
  if (birthday === false) return { error: "birthday", field: "birthday", at: Date.now() };

  const db = getAdminClient();
  if (!db) return { error: "failed", at: Date.now() };
  if (account.state === "new") {
    const { error } = await db.from("customers").insert({ user_id: account.userId, name, phone, email: account.email || null, language, birthday });
    if (error) {
      console.error("[account] profile not created:", error.code, error.message);
      return { error: "failed", at: Date.now() };
    }
    revalidatePath(`/${locale}`, "layout");
    redirect(`/${locale}/account?welcome=1`);
  }
  // A proven (SMS-verified) mobile can't be changed here.
  const verified = await db.from("customers").select("phone_verified_at").eq("id", account.customer.id).maybeSingle();
  const update: Record<string, unknown> = { name, language, birthday };
  if (!verified.data?.phone_verified_at) update.phone = phone;
  const { error } = await db.from("customers").update(update).eq("id", account.customer.id).eq("user_id", account.userId);
  if (error) return { error: "failed", at: Date.now() };
  revalidatePath(`/${locale}`, "layout");
  return { ok: true, at: Date.now() };
}

// ── Add an earlier guest order: order number + the mobile it was placed with ────────────
export type ClaimResult = { ok: true; orderNo: string } | { ok: false; error: "invalid" | "not_found" | "too_many" | "failed" | "signedOut" };

export async function claimOrder(orderNoRaw: string, phoneRaw: string, locale: string): Promise<ClaimResult> {
  const account = await getAccount();
  if (account.state !== "customer") return { ok: false, error: "signedOut" };
  const orderNo = String(orderNoRaw ?? "").trim().toUpperCase();
  const phone = normaliseSaudiMobile(String(phoneRaw ?? ""));
  if (!/^TH-\d{3,7}$/.test(orderNo) || !phone) return { ok: false, error: "invalid" };
  if (!(await allow(await headers(), "claim"))) return { ok: false, error: "too_many" };
  const db = getAdminClient();
  if (!db) return { ok: false, error: "failed" };

  const { data: o } = await db.from("orders").select("id, customer_phone, customer_id").eq("order_no", orderNo).maybeSingle();
  // Same answer for "no such order", "other mobile" and "someone else's account", so nothing leaks.
  const own = o?.customer_id === account.customer.id;
  if (!o || normaliseSaudiMobile(o.customer_phone) !== phone || (o.customer_id && !own)) return { ok: false, error: "not_found" };
  if (!own) {
    const { error } = await db.from("orders").update({ customer_id: account.customer.id }).eq("id", o.id).is("customer_id", null);
    if (error) return { ok: false, error: "failed" };
  }
  revalidatePath(`/${isLocale(locale) ? locale : "en"}/account`);
  return { ok: true, orderNo };
}

// ── Notifications (Row Level Security: only her own rows) ────────────────────────────────
export async function openNotification(id: string, locale: string) {
  const loc2 = isLocale(locale) ? locale : "en";
  const account = await getAccount();
  if (account.state !== "customer") redirect(`/${loc2}/account/sign-in`);
  const supabase = await getSessionClient();
  const { data } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id).select("type, data").maybeSingle();
  revalidatePath(`/${loc2}`, "layout");
  redirect(data && isNotificationType(data.type) ? notificationHref({ type: data.type, data: (data.data ?? {}) as Record<string, string> }, loc2) : `/${loc2}/account/notifications`);
}

export async function markAllRead(locale: string) {
  const account = await getAccount();
  if (account.state !== "customer") return;
  const supabase = await getSessionClient();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
  revalidatePath(`/${isLocale(locale) ? locale : "en"}`, "layout");
}

export async function setNotificationChannel(type: string, channel: string): Promise<{ ok: boolean }> {
  const account = await getAccount();
  if (account.state !== "customer" || !isNotificationType(type) || (channel !== "site" && channel !== "site_whatsapp")) return { ok: false };
  const supabase = await getSessionClient();
  const { error } = await supabase
    .from("notification_prefs")
    .upsert({ customer_id: account.customer.id, type, channel, updated_at: new Date().toISOString() }, { onConflict: "customer_id,type" });
  return { ok: !error };
}
