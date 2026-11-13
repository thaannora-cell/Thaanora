import "server-only";
import { getPublicClient } from "@/lib/supabase/public";
import type { PublicProduct } from "@/lib/product";
import { getLiveCampaigns } from "@/lib/campaigns";
import { campaignSalePct, type LiveCampaign } from "@/lib/campaign-pricing";

// Never add cost_pkr here: the public role is not allowed to read it.
export const PUBLIC_PRODUCT_COLUMNS =
  "id, code, brand, name, fabric, work, collection, price_sar, sale_pct, colour_family, colour_hex, accent_hex, shirt_m, dupatta_m, trouser_m, stock, is_new, trending_rank, occasions, sort_order";

export type ProductsResult =
  | { status: "ok"; products: PublicProduct[] }
  | { status: "not_configured" }
  | { status: "error"; message: string };

// Visible suits with any live campaign discount already folded into sale_pct, so the rack, the panel,
// the "Sale" filter and the bag all show the campaign price. The order route applies the same rule.
export async function getVisibleProducts(campaigns?: LiveCampaign[]): Promise<ProductsResult> {
  const supabase = getPublicClient();
  if (!supabase) return { status: "not_configured" };
  const read = (cols: string) =>
    supabase
      .from("products")
      .select(`${cols}, product_images (storage_path, alt, width, height, sort_order)`)
      .eq("visible", true)
      .order("sort_order")
      .order("sort_order", { referencedTable: "product_images" });
  const [first, live] = await Promise.all([read(`${PUBLIC_PRODUCT_COLUMNS}, on_rack`), campaigns ?? getLiveCampaigns(supabase)]);
  // Before the rack migration has run, on_rack doesn't exist yet: read without it (nothing on the rack).
  const { data, error } = first.error?.code === "42703" ? await read(PUBLIC_PRODUCT_COLUMNS) : first;
  if (error) return { status: "error", message: error.message };
  const products = (data ?? []) as unknown as PublicProduct[];
  return { status: "ok", products: products.map((p) => ({ ...p, on_rack: p.on_rack === true, sale_pct: campaignSalePct(p, live) })) };
}
