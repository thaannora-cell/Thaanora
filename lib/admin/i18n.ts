import "server-only";
import { cookies, headers } from "next/headers";
import { createTranslator } from "next-intl";
import en from "@/messages/admin/en.json";
import ar from "@/messages/admin/ar.json";

// The back office is in English and Arabic. The choice is kept in a cookie (no /en or /ar in the URL).
export const ADMIN_LANGS = ["en", "ar"] as const;
export type AdminLang = (typeof ADMIN_LANGS)[number];
export const ADMIN_LANG_COOKIE = "th_admin_lang";

const MESSAGES = { en, ar } as const;

export async function getAdminLang(): Promise<AdminLang> {
  const saved = (await cookies()).get(ADMIN_LANG_COOKIE)?.value;
  if (saved === "en" || saved === "ar") return saved;
  const accept = (await headers()).get("accept-language") ?? "";
  return /^ar\b/i.test(accept.trim()) ? "ar" : "en";
}

export const adminMessages = (lang: AdminLang) => MESSAGES[lang];

export async function getAdminT() {
  const lang = await getAdminLang();
  return createTranslator({ locale: lang, messages: MESSAGES[lang], namespace: "Admin" });
}
