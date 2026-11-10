"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSessionClient } from "@/lib/supabase/server";
import { ADMIN_LANG_COOKIE } from "@/lib/admin/i18n";
import { allow } from "@/lib/rate-limit";
import { siteOrigin } from "@/lib/site-origin";

export type SignInState =
  | { step: "email"; error?: "badEmail" | "badLink" | "tooMany" | "failed"; email?: string }
  | { step: "code"; email: string; error?: "badCode" | "tooMany" | "failed"; resent?: boolean };

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const clean = (v: FormDataEntryValue | null) => (typeof v === "string" ? v.trim().toLowerCase().slice(0, 200) : "");
const tooMany = (e: { status?: number; code?: string } | null) =>
  e?.status === 429 || /rate_limit/.test(e?.code ?? "");

const origin = siteOrigin;

// One form action for the whole sign-in: intent = send | resend | verify | back.
export async function signInAction(_prev: SignInState, form: FormData): Promise<SignInState> {
  const intent = String(form.get("intent") ?? "send");
  const email = clean(form.get("email"));
  if (intent === "back") return { step: "email", email };
  if (!EMAIL.test(email)) return { step: "email", error: "badEmail", email };
  const supabase = await getSessionClient();

  // Our own limits on top of Supabase's: sign-in emails and codes per visitor.
  const h = await headers();
  if (!(await allow(h, intent === "verify" ? "signInVerify" : "signInSend"))) {
    return intent === "verify" || intent === "resend" ? { step: "code", email, error: "tooMany" } : { step: "email", email, error: "tooMany" };
  }

  if (intent === "verify") {
    // Step 2: check the code. On success the session cookie is set and the back office opens.
    const token = String(form.get("code") ?? "").replace(/\D/g, "").slice(0, 10);
    if (token.length < 6) return { step: "code", email, error: "badCode" };
    const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
    if (error) return { step: "code", email, error: tooMany(error) ? "tooMany" : "badCode" };
    redirect("/admin");
  }

  // Step 1: email a one-time code. shouldCreateUser:false means only existing (staff) accounts get one.
  // The answer is the same whether or not the email is known, so the form can't reveal staff emails.
  const resend = intent === "resend";
  // The email holds a link (free-plan default template) and, once a custom template is set, a code.
  // The link comes back to /admin/auth/callback, which must be in Supabase's allowed Redirect URLs.
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false, emailRedirectTo: `${await origin()}/admin/auth/callback` },
  });
  // The page answers the same either way; the real reason goes to the server log (no email address in it).
  if (error) console.error("[admin sign-in] code not sent:", error.status, error.code, error.message);
  if (tooMany(error)) return resend ? { step: "code", email, error: "tooMany" } : { step: "email", email, error: "tooMany" };
  return { step: "code", email, resent: resend };
}

export async function signOut() {
  const supabase = await getSessionClient();
  await supabase.auth.signOut();
  redirect("/admin/sign-in");
}

export async function setAdminLang(lang: string) {
  if (lang !== "en" && lang !== "ar") return;
  (await cookies()).set(ADMIN_LANG_COOKIE, lang, { path: "/admin", maxAge: 31536000, sameSite: "lax", httpOnly: true, secure: process.env.NODE_ENV === "production" });
  revalidatePath("/admin", "layout");
}
