import "server-only";
import { getSessionClient } from "@/lib/supabase/server";
import { getBrandOfMonth } from "@/lib/campaigns";
import { LOW_STOCK } from "@/lib/product";

export const OCCASIONS = ["Everyday", "Eid", "Wedding", "Birthday", "Anniversary", "Gifts"] as const;
export const FAMILIES = ["red", "earth", "green", "blue", "purple", "neutral"] as const;
export const WORKS = ["Embroidered", "Printed"] as const;

export type AdminPhoto = { id: string; storage_path: string; width: number | null; height: number | null; sort_order: number };
export type AdminProduct = {
  id: string;
  code: string;
  brand: string;
  name: string;
  fabric: string;
  work: (typeof WORKS)[number];
  price_sar: number;
  sale_pct: number;
  cost_pkr: number | null;
  colour_family: (typeof FAMILIES)[number];
  colour_hex: string;
  accent_hex: string;
  stock: number;
  is_new: boolean;
  trending_rank: number | null;
  occasions: string[];
  visible: boolean;
  sort_order: number;
  product_images: AdminPhoto[];
};

export type ProductsPage = {
  products: AdminProduct[];
  rate: number | null; // PKR per SAR; null if this person can't read it
  lowLevel: number;
  brandOfMonth: string | null;
  failed: boolean;
};

// All products (hidden ones too) with cost, read as the signed-in person (RLS: owner and catalogue only).
export async function getProductsPage(): Promise<ProductsPage> {
  const supabase = await getSessionClient();
  const [products, settings, brandOfMonth] = await Promise.all([
    supabase
      .from("products")
      .select(
        "id, code, brand, name, fabric, work, price_sar, sale_pct, cost_pkr, colour_family, colour_hex, accent_hex, stock, is_new, trending_rank, occasions, visible, sort_order, product_images (id, storage_path, width, height, sort_order)",
      )
      .order("sort_order")
      .order("sort_order", { referencedTable: "product_images" }),
    supabase.from("settings").select("key, value").in("key", ["pkr_per_sar", "low_stock_level"]),
    getBrandOfMonth(),
  ]);
  const get = (k: string) => settings.data?.find((r) => r.key === k)?.value;
  const rate = Number(get("pkr_per_sar"));
  const low = Number(get("low_stock_level"));
  return {
    products: ((products.data ?? []) as AdminProduct[]).map((p) => ({ ...p, price_sar: Number(p.price_sar), cost_pkr: p.cost_pkr === null ? null : Number(p.cost_pkr) })),
    rate: Number.isFinite(rate) && rate > 0 ? rate : null,
    lowLevel: Number.isFinite(low) && low >= 0 && get("low_stock_level") !== undefined ? low : LOW_STOCK,
    brandOfMonth,
    failed: Boolean(products.error),
  };
}
