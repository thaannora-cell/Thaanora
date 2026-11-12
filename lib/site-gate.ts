// Pre-launch password gate. Runs in proxy.ts and in the unlock route; uses only Web Crypto.
import { routing, type Locale } from "@/i18n/routing";

export const GATE_COOKIE = "th_gate";
export const GATE_MAX_AGE = 60 * 60 * 24 * 30;

// The cookie holds a hash of the password, never the password. Changing SITE_PASSWORD signs everyone out.
export async function gateToken(password: string): Promise<string> {
  const bytes = new TextEncoder().encode(`thaanora-site-gate:${password}`);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (routing.locales as readonly string[]).includes(value);
}

// Only same-site paths, never back to the unlock screen itself.
export function safeNextPath(value: unknown, locale: Locale): string {
  const fallback = `/${locale}`;
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return fallback;
  }
  if (/^\/(?:[a-z]{2}\/)?unlock(?:[/?#]|$)/.test(value)) return fallback;
  return value;
}
