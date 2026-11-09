import "server-only";
import { getPublicClient } from "@/lib/supabase/public";

export async function getBrandOfMonth(): Promise<string | null> {
  const supabase = getPublicClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("campaigns")
    .select("brand")
    .eq("kind", "brand_of_month")
    .order("sort_order")
    .limit(1)
    .maybeSingle();
  return data?.brand ?? null;
}
