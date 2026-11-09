import "server-only";
import { getPublicClient } from "@/lib/supabase/public";
import type { BundleRule } from "@/lib/pricing";

// The public can read only the active bundle rule (RLS); discount codes stay private.
export async function getBundleRule(): Promise<BundleRule | null> {
  const supabase = getPublicClient();
  if (!supabase) return null;
  const { data } = await supabase.from("offers").select("percent, min_qty").eq("kind", "bundle").limit(1).maybeSingle();
  if (!data || !data.min_qty) return null;
  return { qty: data.min_qty, pct: data.percent };
}
