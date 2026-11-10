import "server-only";
import { getAdminClient } from "@/lib/supabase/admin";

// The visitor's address as Vercel reports it. Only a one-way hash of it is stored.
function visitor(h: Headers): string {
  const fwd = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return fwd || h.get("x-real-ip") || "unknown";
}

async function sha256(text: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");
}

// Limits for every public form, per visitor. Generous for real customers, too tight for scripts.
export const LIMITS = {
  discount: { max: 10, seconds: 600 }, // code checks: 10 per 10 minutes
  orders: { max: 8, seconds: 3600 }, // WhatsApp orders: 8 per hour
  requests: { max: 6, seconds: 3600 }, // sourcing / notify-me / pre-order: 6 per hour
  track: { max: 20, seconds: 600 }, // Track my order: 20 per 10 minutes
  unlock: { max: 10, seconds: 900 }, // test-site password: 10 per 15 minutes
  signInSend: { max: 5, seconds: 900 }, // back-office sign-in emails: 5 per 15 minutes
  signInVerify: { max: 10, seconds: 900 }, // back-office codes typed: 10 per 15 minutes
} as const;
export type LimitName = keyof typeof LIMITS;

// Counts one attempt and says whether it's allowed. The count lives in the database, so it holds
// across all of Vercel's servers. If the limiter can't be reached, the request is allowed (and logged)
// rather than blocking real customers.
export async function allow(headers: Headers, name: LimitName): Promise<boolean> {
  const supabase = getAdminClient();
  if (!supabase) return true;
  const { max, seconds } = LIMITS[name];
  const key = `${name}:${(await sha256(`${name}|${visitor(headers)}`)).slice(0, 32)}`;
  const { data, error } = await supabase.rpc("rate_limit_hit", { p_key: key, p_max: max, p_window_seconds: seconds });
  if (error) {
    console.error("[rate-limit] not checked:", error.code, error.message);
    return true;
  }
  return data === true;
}

export const tooMany = (seconds: number) => ({ status: 429, headers: { "Retry-After": String(seconds), "Cache-Control": "no-store" } });
