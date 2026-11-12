import "server-only";
import { getAdminClient } from "@/lib/supabase/admin";
import { getPublicClient } from "@/lib/supabase/public";

// The codes of her saved suits (visible ones only), or null if they couldn't be read (then the device's
// hearts are kept as they are). Only call with the id from getAccount().
export async function favoriteCodes(customerId: string): Promise<string[] | null> {
  const db = getAdminClient();
  if (!db) return null;
  const { data, error } = await db
    .from("favorites")
    .select("created_at, products!inner (code, visible)")
    .eq("customer_id", customerId)
    .eq("products.visible", true)
    .order("created_at");
  if (error) return null;
  return (data ?? [])
    .map((f) => (Array.isArray(f.products) ? f.products[0] : f.products) as { code: string } | null)
    .filter((p): p is { code: string } => Boolean(p))
    .map((p) => p.code);
}

// Product ids for codes the website shows (visible products), for saving hearts.
export async function visibleProductIds(codes: string[]): Promise<Map<string, string>> {
  const clean = [...new Set(codes.filter((c) => typeof c === "string" && /^[\w.-]{1,64}$/.test(c)))].slice(0, 200);
  const supabase = getPublicClient();
  if (!supabase || clean.length === 0) return new Map();
  const { data } = await supabase.from("products").select("id, code").in("code", clean);
  return new Map((data ?? []).map((p) => [p.code as string, p.id as string]));
}
