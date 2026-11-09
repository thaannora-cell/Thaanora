import "server-only";
import { getPublicClient } from "@/lib/supabase/public";

// Never add cost_pkr here: the public role is not allowed to read it.
export const PUBLIC_PRODUCT_COLUMNS =
  "id, code, brand, name, fabric, work, collection, price_sar, sale_pct, colour_family, colour_hex, accent_hex, shirt_m, dupatta_m, trouser_m, stock, is_new, trending_rank, occasions, sort_order";

export type PublicProduct = {
  id: string;
  code: string;
  brand: string;
  name: string;
  fabric: string;
  work: "Embroidered" | "Printed";
  collection: string | null;
  price_sar: number;
  sale_pct: number;
  colour_family: string;
  colour_hex: string;
  accent_hex: string;
  shirt_m: number;
  dupatta_m: number;
  trouser_m: number;
  stock: number;
  is_new: boolean;
  trending_rank: number | null;
  occasions: string[];
  sort_order: number;
  product_images: ProductImage[];
};

export type ProductImage = {
  storage_path: string;
  alt: string | null;
  width: number | null;
  height: number | null;
  sort_order: number;
};

export const PHOTO_BUCKET = "product-photos";

export function photoUrl(storagePath: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const encoded = storagePath.split("/").map(encodeURIComponent).join("/");
  return `${base}/storage/v1/object/public/${PHOTO_BUCKET}/${encoded}`;
}

export function salePrice(p: Pick<PublicProduct, "price_sar" | "sale_pct">): number {
  return p.sale_pct ? Math.round(p.price_sar * (1 - p.sale_pct / 100)) : Number(p.price_sar);
}

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
