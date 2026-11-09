import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export const CODE_PATTERN = /^[A-Z0-9_-]{2,32}$/;

// Returns the code's percent if it is active, within its dates and under its usage limit.
export async function findLiveCode(admin: SupabaseClient, raw: string): Promise<{ code: string; percent: number } | null> {
  const code = raw.trim().toUpperCase();
  if (!CODE_PATTERN.test(code)) return null;
  const { data } = await admin
    .from("offers")
    .select("code, percent, starts_at, ends_at, usage_limit, used_count")
    .eq("kind", "code")
    .eq("active", true)
    .eq("code", code)
    .maybeSingle();
  if (!data) return null;
  const now = Date.now();
  const live =
    (!data.starts_at || Date.parse(data.starts_at) <= now) &&
    (!data.ends_at || Date.parse(data.ends_at) > now) &&
    (data.usage_limit == null || data.used_count < data.usage_limit);
  return live ? { code: data.code, percent: data.percent } : null;
}
