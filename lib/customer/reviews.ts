import "server-only";
import { cache } from "react";
import { getAdminClient } from "@/lib/supabase/admin";
import { getPublicClient } from "@/lib/supabase/public";

export type ReviewableSuit = {
  productId: string;
  orderId: string;
  orderNo: string;
  code: string;
  name: string;
  review: { rating: number; body: string; status: "pending" | "published" | "hidden"; reply: string | null } | null;
};

// Suits she received (delivered orders), once each, newest first, with her review if she wrote one.
// Only ever call with the customer id from getAccount().
export const reviewableSuits = cache(async (customerId: string): Promise<ReviewableSuit[]> => {
  const db = getAdminClient();
  if (!db) return [];
  const [orders, reviews] = await Promise.all([
    db
      .from("orders")
      .select("id, order_no, status_changed_at, order_items (product_id, product_code, product_name)")
      .eq("customer_id", customerId)
      .eq("status", "delivered_cash_collected")
      .order("status_changed_at", { ascending: false }),
    db.from("reviews").select("product_id, rating, body, status, reply").eq("customer_id", customerId),
  ]);
  const mine = new Map((reviews.data ?? []).map((r) => [r.product_id, r]));
  const seen = new Set<string>();
  const out: ReviewableSuit[] = [];
  type Item = { product_id: string | null; product_code: string; product_name: string };
  for (const o of orders.data ?? []) {
    for (const i of (o.order_items ?? []) as Item[]) {
      if (!i.product_id || seen.has(i.product_id)) continue;
      seen.add(i.product_id);
      const r = mine.get(i.product_id);
      out.push({
        productId: i.product_id,
        orderId: o.id,
        orderNo: o.order_no,
        code: i.product_code,
        name: i.product_name,
        review: r ? { rating: r.rating, body: r.body, status: r.status, reply: r.reply } : null,
      });
    }
  }
  return out;
});

export type PublicReview = { id: string; rating: number; body: string; author: string; language: string; reply: string | null; createdAt: string };

// Published reviews of one suit (public).
export async function publishedReviews(code: string, limit = 20): Promise<PublicReview[]> {
  const db = getPublicClient();
  if (!db || !/^[A-Za-z0-9_-]{1,64}$/.test(code)) return [];
  const { data: p } = await db.from("products").select("id").eq("code", code).eq("visible", true).maybeSingle();
  if (!p) return [];
  const { data } = await db
    .from("reviews")
    .select("id, rating, body, author_name, language, reply, created_at")
    .eq("product_id", p.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((r) => ({ id: r.id, rating: r.rating, body: r.body, author: r.author_name, language: r.language, reply: r.reply, createdAt: r.created_at }));
}
