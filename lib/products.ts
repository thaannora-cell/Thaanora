import "server-only";
import { getPublicClient } from "@/lib/supabase/public";
import type { PublicProduct } from "@/lib/product";

// Never add cost_pkr here: the public role is not allowed to read it.
export const PUBLIC_PRODUCT_COLUMNS =
  "id, code, brand, name, fabric, work, collection, price_sar, sale_pct, colour_family, colour_hex, accent_hex, shirt_m, dupatta_m, trouser_m, stock, is_new, trending_rank, occasions, sort_order";

export type ProductsResult =
  | { status: "ok"; products: PublicProduct[] }
  | { status: "not_configured" }
  | { status: "error"; message: string };

export async function getVisibleProducts(): Promise<ProductsResult> {
  const supabase = getPublicClient();
  if (!supabase) return { status: "not_configured" };
  const { data, error } = await supabase
    .from("products")
    .select(`${PUBLIC_PRODUCT_COLUMNS}, product_images (storage_path, alt, width, height, sort_order)`)
    .eq("visible", true)
    .order("sort_order")
    .order("sort_order", { referencedTable: "product_images" });
  if (error) return { status: "error", message: error.message };
  return { status: "ok", products: (data ?? []) as unknown as PublicProduct[] };
}
