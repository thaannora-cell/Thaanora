import "server-only";
import type { NextRequest } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";

// The visitor's address as Vercel reports it. Only a one-way hash of it is stored.
function visitor(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return fwd || req.headers.get("x-real-ip") || "unknown";
}

async function sha256(text: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");
}

// Counts one attempt for this purpose and visitor; false means over the limit.
// The count lives in the database, so it holds across all of Vercel's servers.
// If the limiter itself can't be reached, the request is allowed (and logged) rather than blocking real customers.
export async function allow(req: NextRequest, purpose: string, max: number, windowSeconds: number): Promise<boolean> {
  const supabase = getAdminClient();
  if (!supabase) return true;
  const key = `${purpose}:${(await sha256(`${purpose}|${visitor(req)}`)).slice(0, 32)}`;
  const { data, error } = await supabase.rpc("rate_limit_hit", { p_key: key, p_max: max, p_window_seconds: windowSeconds });
  if (error) {
    console.error("[rate-limit] not checked:", error.code, error.message);
    return true;
  }
  return data === true;
}
