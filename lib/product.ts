// Product types and pure helpers, safe in both server and browser code.

export type ProductImage = {
  storage_path: string;
  alt: string | null;
  width: number | null;
  height: number | null;
  sort_order: number;
};

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

// Matches the default low_stock_level setting; that setting is staff-only, so the site uses this.
export const LOW_STOCK = 3;

export const PHOTO_BUCKET = "product-photos";

export function photoUrl(storagePath: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const encoded = storagePath.split("/").map(encodeURIComponent).join("/");
  return `${base}/storage/v1/object/public/${PHOTO_BUCKET}/${encoded}`;
}

export function salePrice(p: Pick<PublicProduct, "price_sar" | "sale_pct">): number {
  return p.sale_pct ? Math.round(p.price_sar * (1 - p.sale_pct / 100)) : Number(p.price_sar);
}

export function stockState(stock: number): "out" | "low" | "in" {
  if (stock <= 0) return "out";
  return stock <= LOW_STOCK ? "low" : "in";
}
