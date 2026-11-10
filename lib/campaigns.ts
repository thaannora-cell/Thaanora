import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getPublicClient } from "@/lib/supabase/public";
import { isLiveNow, type LiveCampaign } from "@/lib/campaign-pricing";

// Brand of the month, top-bar messages and campaigns switch on and off by their dates:
// the public policy only returns live rows, and isLiveNow checks again for the server's own client.
export async function getBrandOfMonth(): Promise<string | null> {
  const supabase = getPublicClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("campaigns")
    .select("brand, active, starts_at, ends_at")
    .eq("kind", "brand_of_month")
    .order("sort_order");
  return (data ?? []).find((c) => isLiveNow(c) && c.brand)?.brand ?? null;
}

// Live seasonal campaigns. Pass the order route's client so checkout prices match the rack exactly.
export async function getLiveCampaigns(client?: SupabaseClient | null): Promise<LiveCampaign[]> {
  const supabase = client ?? getPublicClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("campaigns")
    .select("title, percent, occasion, active, starts_at, ends_at")
    .eq("kind", "campaign")
    .eq("active", true)
    .order("sort_order");
  return (data ?? [])
    .filter((c) => isLiveNow(c))
    .map((c) => ({ title: (c.title ?? {}) as Record<string, string>, percent: c.percent ?? 0, occasion: c.occasion, endsAt: c.ends_at }));
}

const pick = (title: Record<string, string>, locale: string) => (title[locale] || title.en || "").trim();

// Lines for the rotating top bar: live campaigns first, then the top-bar messages, in the visitor's language
// (English when a message has no translation). Empty means "use the built-in message".
export async function getTopBarLines(locale: string, campaigns?: LiveCampaign[]): Promise<string[]> {
  const supabase = getPublicClient();
  if (!supabase) return [];
  const [live, messages] = await Promise.all([
    campaigns ?? getLiveCampaigns(supabase),
    supabase.from("campaigns").select("title, active, starts_at, ends_at").eq("kind", "topbar_message").order("sort_order"),
  ]);
  return [
    ...live.map((c) => pick(c.title, locale)),
    ...(messages.data ?? []).filter((m) => isLiveNow(m)).map((m) => pick((m.title ?? {}) as Record<string, string>, locale)),
  ]
    .filter(Boolean)
    .slice(0, 8);
}
