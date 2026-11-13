import "server-only";
import { getSessionClient } from "@/lib/supabase/server";

export const REVIEW_STATUSES = ["pending", "published", "hidden"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];
export const isReviewStatus = (v: unknown): v is ReviewStatus => typeof v === "string" && (REVIEW_STATUSES as readonly string[]).includes(v);

export type AdminReview = {
  id: string;
  code: string;
  product: string;
  author: string;
  rating: number;
  body: string;
  language: string;
  status: ReviewStatus;
  reply: string | null;
  createdAt: string;
};

// Read as the signed-in staff member (RLS: owner and catalogue team see every review).
export async function listReviews(status: ReviewStatus | null): Promise<{ rows: AdminReview[]; counts: Record<ReviewStatus, number>; failed: boolean }> {
  const supabase = await getSessionClient();
  let q = supabase
    .from("reviews")
    .select("id, rating, body, author_name, language, status, reply, created_at, products (code, name)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (status) q = q.eq("status", status);
  const [list, all] = await Promise.all([q, supabase.from("reviews").select("status")]);
  const counts = { pending: 0, published: 0, hidden: 0 } as Record<ReviewStatus, number>;
  for (const r of all.data ?? []) if (isReviewStatus(r.status)) counts[r.status]++;
  type Row = { id: string; rating: number; body: string; author_name: string; language: string; status: ReviewStatus; reply: string | null; created_at: string; products: { code: string; name: string } | null };
  return {
    rows: ((list.data ?? []) as unknown as Row[]).map((r) => ({
      id: r.id,
      code: r.products?.code ?? "",
      product: r.products?.name ?? "",
      author: r.author_name,
      rating: r.rating,
      body: r.body,
      language: r.language,
      status: r.status,
      reply: r.reply,
      createdAt: r.created_at,
    })),
    counts,
    failed: Boolean(list.error),
  };
}
