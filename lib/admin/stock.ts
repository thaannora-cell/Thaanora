import "server-only";
import { getSessionClient } from "@/lib/supabase/server";
import { LOW_STOCK } from "@/lib/product";

export type StockReason = "receive_shipment" | "sale" | "adjustment" | "return" | "refused_at_door" | "damaged";
export type StockRow = { id: string; name: string; brand: string; code: string; stock: number; visible: boolean; photo: string | null; colour: string };
export type Movement = {
  id: string;
  productId: string;
  product: string;
  code: string;
  delta: number;
  reason: StockReason;
  note: string | null;
  who: string | null; // staff name, or null for the system / an unknown account
  at: string;
};

export type StockPage = { products: StockRow[]; lowLevel: number; history: Movement[]; failed: boolean };

const HISTORY_LIMIT = 100;

// Read as the signed-in person (RLS: owner and catalogue). History is newest first, optionally for one suit.
export async function getStockPage(productId?: string): Promise<StockPage> {
  const supabase = await getSessionClient();
  let history = supabase
    .from("stock_movements")
    .select("id, product_id, delta, reason, note, created_by, created_at, products (name, code)")
    .order("created_at", { ascending: false })
    .limit(HISTORY_LIMIT);
  if (productId) history = history.eq("product_id", productId);

  const [products, level, moves, names] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, brand, code, stock, visible, colour_hex, sort_order, product_images (storage_path, sort_order)")
      .order("sort_order")
      .order("sort_order", { referencedTable: "product_images" }),
    supabase.from("settings").select("value").eq("key", "low_stock_level").maybeSingle(),
    history,
    supabase.rpc("staff_names"),
  ]);

  const who = new Map<string, string>(((names.data ?? []) as { user_id: string; name: string }[]).map((n) => [n.user_id, n.name]));
  const low = Number(level.data?.value);
  type ProductJoin = { name: string; code: string } | null;

  return {
    products: (products.data ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      brand: p.brand,
      code: p.code,
      stock: p.stock,
      visible: p.visible,
      colour: p.colour_hex,
      photo: p.product_images?.[0]?.storage_path ?? null,
    })),
    lowLevel: level.data && Number.isFinite(low) && low >= 0 ? low : LOW_STOCK,
    history: (moves.data ?? []).map((m) => {
      const prod = m.products as unknown as ProductJoin;
      return {
        id: m.id,
        productId: m.product_id,
        product: prod?.name ?? "—",
        code: prod?.code ?? "",
        delta: m.delta,
        reason: m.reason as StockReason,
        note: m.note,
        who: m.created_by ? (who.get(m.created_by) ?? null) : null,
        at: m.created_at,
      };
    }),
    failed: Boolean(products.error || moves.error),
  };
}
