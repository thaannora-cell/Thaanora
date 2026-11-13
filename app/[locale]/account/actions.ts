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
import { isLocale, safeNextPath } from "@/lib/site-gate";
import { isNotificationType, notificationHref } from "@/lib/notifications";
import { favoriteCodes, visibleProductIds } from "@/lib/customer/favorites";
import { getCheckoutSettings } from "@/lib/shop-data";
import { cleanMeasurements } from "@/lib/measurements";

// ── Sign in with an email code ──────────────────────────────────────────────
export type CustomerSignInState =
  | { step: "email"; error?: "badEmail" | "badLink" | "tooMany" | "failed"; email?: string }
  | { step: "code"; email: string; error?: "badCode" | "tooMany" | "failed"; resent?: boolean };

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const lowerEmail = (v: FormDataEntryValue | null) => (typeof v === "string" ? v.trim().toLowerCase().slice(0, 200) : "");
const tooMany = (e: { status?: number; code?: string } | null) => e?.status === 429 || /rate_limit/.test(e?.code ?? "");
const loc = (v: FormDataEntryValue | null) => (isLocale(v) ? v : "en");
// Where to go after signing in (e.g. back to the bag): same-site paths only, else nowhere special.
const nextOf = (v: FormDataEntryValue | null, locale: "en" | "ar" | "ur" | "hi") => (typeof v === "string" && v ? safeNextPath(v, locale) : null);
const withNext = (path: string, next: string | null) => (next ? `${path}?next=${encodeURIComponent(next)}` : path);

// One action for the whole sign-in: intent = send | resend | verify | back. New emails get an account
// (that's the sign-up); the profile is filled in on the next page.
export async function customerSignIn(_prev: CustomerSignInState, form: FormData): Promise<CustomerSignInState> {
  const intent = String(form.get("intent") ?? "send");
  const locale = loc(form.get("locale"));
  const next = nextOf(form.get("next"), locale);
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
    redirect(withNext(`/${locale}/account`, next));
  }

  // The email has the 6-digit code (and a link back to this site, which works in the same browser).
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true, emailRedirectTo: withNext(`${await siteOrigin()}/${locale}/account/auth/callback`, next) },
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
    const next = nextOf(form.get("next"), locale);
    redirect(next ?? `/${locale}/account?welcome=1`);
  }
  // A proven (SMS-verified) mobile can't be changed here.
  const verified = await db.from("customers").select("phone_verified_at").eq("id", account.customer.id).maybeSingle();
  // The birthday is set once (it unlocks the yearly birthday gift); after that only staff change it.
  const update: Record<string, unknown> = { name, language, ...(account.customer.birthday ? {} : { birthday }) };
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

// ── Cancel her own order while it's still "Waiting for confirmation" ──────────────────────
export type CancelResult = { ok: true } | { ok: false; error: "notAllowed" | "failed" };

export async function cancelMyOrder(orderNo: string, locale: string): Promise<CancelResult> {
  const account = await getAccount();
  if (account.state !== "customer" || !/^TH-\d{3,7}$/.test(orderNo)) return { ok: false, error: "notAllowed" };
  const db = getAdminClient();
  if (!db) return { ok: false, error: "failed" };
  const { data: o } = await db.from("orders").select("id, status, notes").eq("order_no", orderNo).eq("customer_id", account.customer.id).maybeSingle();
  if (!o || o.status !== "waiting_confirmation") return { ok: false, error: "notAllowed" };

  // A note for the team on the order page, then the cancel (only if it's still waiting at that moment).
  const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
  const note = `Cancelled by the customer on the website (${stamp} UTC).`;
  const { data: done, error } = await db
    .from("orders")
    .update({ status: "cancelled", notes: o.notes ? `${o.notes}\n${note}` : note })
    .eq("id", o.id)
    .eq("status", "waiting_confirmation")
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, error: "failed" };
  if (!done) return { ok: false, error: "notAllowed" };

  // She cancelled it herself: no "your order was cancelled" message for her, on the site or WhatsApp.
  const now = new Date().toISOString();
  await db
    .from("notifications")
    .update({ read_at: now })
    .eq("customer_id", account.customer.id)
    .eq("type", "order_status")
    .eq("data->>orderNo", orderNo)
    .is("read_at", null);
  await db
    .from("notifications")
    .update({ whatsapp_status: "skipped", whatsapp_done_at: now })
    .eq("customer_id", account.customer.id)
    .eq("type", "order_status")
    .eq("data->>orderNo", orderNo)
    .eq("whatsapp_status", "pending");

  const loc2 = isLocale(locale) ? locale : "en";
  revalidatePath(`/${loc2}`, "layout");
  return { ok: true };
}

// ── Favourites (the hearts on the rack) ───────────────────────────────────────────────────
// Signed in: hearts made on this device before signing in are added to her account, and the
// answer is everything she has saved, so every device shows the same hearts.
export async function syncFavourites(localCodes: string[]): Promise<string[] | null> {
  const account = await getAccount();
  if (account.state !== "customer") return null;
  const ids = await visibleProductIds(Array.isArray(localCodes) ? localCodes : []);
  if (ids.size) {
    const supabase = await getSessionClient();
    await supabase
      .from("favorites")
      .upsert([...ids.values()].map((product_id) => ({ customer_id: account.customer.id, product_id })), { onConflict: "customer_id,product_id", ignoreDuplicates: true });
  }
  return favoriteCodes(account.customer.id);
}

export async function setFavourite(code: string, on: boolean): Promise<{ ok: boolean }> {
  const account = await getAccount();
  if (account.state !== "customer") return { ok: false };
  const id = (await visibleProductIds([code])).get(code);
  if (!id) return { ok: false };
  const supabase = await getSessionClient();
  const { error } = on
    ? await supabase.from("favorites").upsert({ customer_id: account.customer.id, product_id: id }, { onConflict: "customer_id,product_id", ignoreDuplicates: true })
    : await supabase.from("favorites").delete().eq("customer_id", account.customer.id).eq("product_id", id);
  return { ok: !error };
}

// ── Saved addresses (Row Level Security: only her own) ───────────────────────────────────
export type AddressState = { ok?: boolean; error?: "label" | "name" | "phone" | "area" | "pin" | "tooMany" | "failed" | "signedOut"; field?: string; at?: number };

const oneLine = (v: FormDataEntryValue | null, max: number) => String(v ?? "").trim().replace(/\s+/g, " ").slice(0, max);

export async function saveAddress(_prev: AddressState, form: FormData): Promise<AddressState> {
  const account = await getAccount();
  if (account.state !== "customer") return { error: "signedOut", at: Date.now() };
  const locale = loc(form.get("locale"));
  const id = String(form.get("id") ?? "");
  const label = oneLine(form.get("label"), 40);
  if (!label) return { error: "label", field: "label", at: Date.now() };
  const recipientName = oneLine(form.get("recipientName"), 80);
  if (!recipientName) return { error: "name", field: "recipientName", at: Date.now() };
  const phoneRaw = oneLine(form.get("recipientPhone"), 20);
  const recipientPhone = phoneRaw ? normaliseSaudiMobile(phoneRaw) : null;
  if (phoneRaw && !recipientPhone) return { error: "phone", field: "recipientPhone", at: Date.now() };
  const area = oneLine(form.get("area"), 120);
  const { areas } = await getCheckoutSettings();
  if (!areas.some((a) => a.area === area)) return { error: "area", field: "area", at: Date.now() };
  const latRaw = String(form.get("lat") ?? "").trim();
  const lngRaw = String(form.get("lng") ?? "").trim();
  let lat: number | null = null;
  let lng: number | null = null;
  if (latRaw || lngRaw) {
    lat = Number(latRaw);
    lng = Number(lngRaw);
    if (!(lat >= 15 && lat <= 33 && lng >= 34 && lng <= 56)) return { error: "pin", field: "pin", at: Date.now() };
    lat = Math.round(lat * 1e6) / 1e6;
    lng = Math.round(lng * 1e6) / 1e6;
  }
  const row = {
    label,
    recipient_name: recipientName,
    recipient_phone: recipientPhone,
    area,
    district: oneLine(form.get("district"), 80) || null,
    details: String(form.get("details") ?? "").trim().slice(0, 300) || null,
    lat,
    lng,
    is_gift: form.get("isGift") === "on",
  };

  const supabase = await getSessionClient();
  const { data: existing } = await supabase.from("addresses").select("id, is_default");
  const list = existing ?? [];
  const makeDefault = form.get("isDefault") === "on" || list.length === 0 || (list.length === 1 && list[0].id === id);
  if (makeDefault) await supabase.from("addresses").update({ is_default: false }).neq("id", id || "00000000-0000-0000-0000-000000000000");
  if (id) {
    const { error } = await supabase.from("addresses").update({ ...row, is_default: makeDefault || list.find((a) => a.id === id)?.is_default === true }).eq("id", id);
    if (error) return { error: "failed", at: Date.now() };
  } else {
    if (list.length >= 10) return { error: "tooMany", at: Date.now() };
    const { error } = await supabase.from("addresses").insert({ ...row, customer_id: account.customer.id, is_default: makeDefault });
    if (error) return { error: "failed", at: Date.now() };
  }
  revalidatePath(`/${locale}/account/addresses`);
  redirect(`/${locale}/account/addresses`);
}

export async function deleteAddress(id: string, locale: string) {
  const account = await getAccount();
  if (account.state !== "customer") return;
  const supabase = await getSessionClient();
  const { data: gone } = await supabase.from("addresses").delete().eq("id", id).select("is_default").maybeSingle();
  // Keep one default if any address is left.
  if (gone?.is_default) {
    const { data: next } = await supabase.from("addresses").select("id").order("created_at").limit(1).maybeSingle();
    if (next) await supabase.from("addresses").update({ is_default: true }).eq("id", next.id);
  }
  revalidatePath(`/${isLocale(locale) ? locale : "en"}/account/addresses`);
}

export async function makeDefaultAddress(id: string, locale: string) {
  const account = await getAccount();
  if (account.state !== "customer") return;
  const supabase = await getSessionClient();
  const { data: own } = await supabase.from("addresses").select("id").eq("id", id).maybeSingle();
  if (!own) return;
  await supabase.from("addresses").update({ is_default: false }).neq("id", id);
  await supabase.from("addresses").update({ is_default: true }).eq("id", id);
  revalidatePath(`/${isLocale(locale) ? locale : "en"}/account/addresses`);
}

// ── My tailor and measurements (written by the server, only for her own profile) ─────────
export async function saveMeasurements(input: unknown): Promise<{ ok: boolean }> {
  const account = await getAccount();
  if (account.state !== "customer") return { ok: false };
  const db = getAdminClient();
  if (!db) return { ok: false };
  const { error } = await db.from("customers").update({ measurements: cleanMeasurements(input) }).eq("id", account.customer.id).eq("user_id", account.userId);
  return { ok: !error };
}

export async function chooseTailor(tailorId: string | null, locale: string): Promise<{ ok: boolean }> {
  const account = await getAccount();
  if (account.state !== "customer") return { ok: false };
  const db = getAdminClient();
  if (!db) return { ok: false };
  if (tailorId) {
    const { data: t } = await db.from("tailors").select("id").eq("id", tailorId).eq("visible", true).maybeSingle();
    if (!t) return { ok: false };
  }
  const { error } = await db.from("customers").update({ tailor_id: tailorId }).eq("id", account.customer.id).eq("user_id", account.userId);
  revalidatePath(`/${isLocale(locale) ? locale : "en"}/account`, "layout");
  return { ok: !error };
}
