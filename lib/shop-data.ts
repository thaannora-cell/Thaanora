import "server-only";
import { getPublicClient } from "@/lib/supabase/public";

export type Tailor = { id: string; name: string; area: string; member_price_note: string | null };

export async function getTailors(): Promise<Tailor[]> {
  const supabase = getPublicClient();
  if (!supabase) return [];
  const { data } = await supabase.from("tailors").select("id, name, area, member_price_note").order("sort_order");
  return (data ?? []) as Tailor[];
}

export async function getDeliveryAreas(): Promise<string[]> {
  const supabase = getPublicClient();
  if (!supabase) return [];
  const { data } = await supabase.from("settings").select("value").eq("key", "delivery_fees").maybeSingle();
  const fees = Array.isArray(data?.value) ? (data.value as { area?: unknown }[]) : [];
  return fees.map((f) => f.area).filter((a): a is string => typeof a === "string");
}
