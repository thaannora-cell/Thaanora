import "server-only";
import { getAdminClient } from "@/lib/supabase/admin";
import { favoriteCodes } from "@/lib/customer/favorites";
import type { PublicProduct } from "@/lib/product";

export type Pick = { code: string; note: string | null };
export type Recommendations = { trending: string[]; picks: Pick[]; forYou: string[] };

const TRENDING_MAX = 10;
const FOR_YOU_MAX = 8;
const inStock = (p: PublicProduct) => p.stock > 0;

// "Trending in Riyadh this week": suits the owner ranked (Trending # in Products) first, in that order,
// then the most ordered / added / opened in the last 7 days. In stock only.
export async function trendingCodes(products: PublicProduct[]): Promise<string[]> {
  const pinned = products.filter((p) => p.trending_rank && inStock(p)).sort((a, b) => (a.trending_rank ?? 0) - (b.trending_rank ?? 0));
  const out = pinned.map((p) => p.code);
  const db = getAdminClient();
  if (db) {
    const { data } = await db.rpc("trending_scores", { p_days: 7 });
    const byId = new Map(products.map((p) => [p.id, p]));
    const scored = ((data ?? []) as { product_id: string; score: number }[])
      .map((r) => ({ p: byId.get(r.product_id), score: Number(r.score) }))
      .filter((r): r is { p: PublicProduct; score: number } => Boolean(r.p) && inStock(r.p!) && r.score > 0)
      .sort((a, b) => b.score - a.score);
    for (const r of scored) if (!out.includes(r.p.code)) out.push(r.p.code);
  }
  return out.slice(0, TRENDING_MAX);
}

// "Our picks": the suits the owner ticked, in product order, with the note in her language.
export function picks(products: PublicProduct[], locale: string): Pick[] {
  return products.filter((p) => p.is_pick).map((p) => ({ code: p.code, note: p.pick_note?.[locale] || p.pick_note?.en || null }));
}

// "For you" (signed in): suits like the ones she saved and bought: same brands, colours and occasions.
// Never a suit she already bought or saved; in stock only. Empty when there's nothing to go on yet.
export async function forYouCodes(customerId: string, products: PublicProduct[]): Promise<string[]> {
  const db = getAdminClient();
  if (!db) return [];
  const [saved, bought] = await Promise.all([
    favoriteCodes(customerId),
    db.from("orders").select("status, order_items (product_code)").eq("customer_id", customerId).then(({ data }) =>
      (data ?? []).filter((o) => o.status !== "cancelled").flatMap((o) => ((o.order_items ?? []) as { product_code: string }[]).map((i) => i.product_code)),
    ),
  ]);
  const liked = new Set([...(saved ?? []), ...bought]);
  if (liked.size === 0) return [];
  const byCode = new Map(products.map((p) => [p.code, p]));
  const brands = new Map<string, number>();
  const colours = new Map<string, number>();
  const occasions = new Map<string, number>();
  const bump = (m: Map<string, number>, k: string, w: number) => m.set(k, (m.get(k) ?? 0) + w);
  for (const code of liked) {
    const p = byCode.get(code);
    if (!p) continue;
    const w = bought.includes(code) ? 2 : 1; // a purchase says more than a heart
    bump(brands, p.brand, w);
    bump(colours, p.colour_family, w);
    for (const o of p.occasions) bump(occasions, o, w);
  }
  return products
    .filter((p) => inStock(p) && !liked.has(p.code))
    .map((p) => ({
      code: p.code,
      score:
        (brands.get(p.brand) ?? 0) * 3 +
        (colours.get(p.colour_family) ?? 0) * 2 +
        p.occasions.reduce((n, o) => n + (occasions.get(o) ?? 0), 0) +
        (p.is_new ? 0.5 : 0),
    }))
    .filter((x) => x.score >= 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, FOR_YOU_MAX)
    .map((x) => x.code);
}
