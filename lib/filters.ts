import type { PublicProduct } from "@/lib/products";

export const OCCASIONS = ["all", "new", "Everyday", "Eid", "Wedding", "Birthday", "Anniversary", "Gifts", "sale", "saved"] as const;
export type Occasion = (typeof OCCASIONS)[number];

export const COLOUR_FAMILIES = [
  { id: "red", swatch: "#8E1F2F" },
  { id: "earth", swatch: "#C27C3E" },
  { id: "green", swatch: "#4F6B3A" },
  { id: "blue", swatch: "#2C3E6B" },
  { id: "purple", swatch: "#A894C4" },
  { id: "neutral", swatch: "#E8E0D0" },
] as const;
export type ColourFamily = (typeof COLOUR_FAMILIES)[number]["id"];

export type Filters = {
  occasion: Occasion;
  family: "all" | ColourFamily;
  brand: "all" | string;
  query: string;
};

export const DEFAULT_FILTERS: Filters = { occasion: "all", family: "all", brand: "all", query: "" };

type FilterableProduct = Pick<
  PublicProduct,
  "code" | "brand" | "name" | "fabric" | "colour_family" | "sale_pct" | "is_new" | "occasions"
>;

export function filterProducts<T extends FilterableProduct>(products: T[], f: Filters, savedCodes: string[]): T[] {
  const q = f.query.trim().toLowerCase();
  return products.filter((p) => {
    if (f.family !== "all" && p.colour_family !== f.family) return false;
    if (f.brand !== "all" && p.brand !== f.brand) return false;
    if (q && !`${p.brand} ${p.name} ${p.code} ${p.fabric}`.toLowerCase().includes(q)) return false;
    switch (f.occasion) {
      case "all":
        return true;
      case "sale":
        return p.sale_pct > 0;
      case "new":
        return p.is_new;
      case "saved":
        return savedCodes.includes(p.code);
      default:
        return p.occasions.includes(f.occasion);
    }
  });
}

export function brandsOf(products: Pick<PublicProduct, "brand">[]): string[] {
  return [...new Set(products.map((p) => p.brand))];
}
