"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/admin/session";
import { canOpen } from "@/lib/admin/sections";
import { getSessionClient } from "@/lib/supabase/server";
import { FAMILIES, OCCASIONS, WORKS } from "@/lib/admin/products";
import { PHOTO_BUCKET } from "@/lib/product";

export type ProductInput = {
  code: string;
  brand: string;
  name: string;
  fabric: string;
  work: string;
  price_sar: number;
  sale_pct: number;
  cost_pkr: number | null;
  stock: number;
  trending_rank: number | null;
  is_new: boolean;
  visible: boolean;
  on_rack: boolean; // on the rack at the top (max 17) or in the collection grid
  is_pick: boolean; // "Our picks" on the home page
  pick_note: Partial<Record<"en" | "ar" | "ur" | "hi", string>>;
  colour_family: string;
  colour_hex: string;
  accent_hex: string;
  occasions: string[];
};

export type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; error: string; field?: keyof ProductInput };

// Every action re-checks the role on the server; RLS checks it again in the database.
async function catalogueClient() {
  const session = await getSession();
  if (session.state !== "staff" || !canOpen(session.staff.role, "products")) return null;
  return getSessionClient();
}

const HEX = /^#[0-9A-Fa-f]{6}$/;
const CODE = /^[A-Za-z0-9][A-Za-z0-9._\-/ ]{0,39}$/;
const int = (n: unknown) => (typeof n === "number" && Number.isInteger(n) ? n : NaN);

function validate(p: ProductInput): ActionResult<{ row: Omit<ProductInput, "stock"> }> {
  const s = (v: unknown, max: number) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "");
  const row = {
    code: s(p.code, 40),
    brand: s(p.brand, 60),
    name: s(p.name, 120),
    fabric: s(p.fabric, 60),
    work: p.work,
    price_sar: Number(p.price_sar),
    sale_pct: int(p.sale_pct),
    cost_pkr: p.cost_pkr === null ? null : Number(p.cost_pkr),
    trending_rank: p.trending_rank === null ? null : int(p.trending_rank),
    is_new: Boolean(p.is_new),
    visible: Boolean(p.visible),
    on_rack: Boolean(p.on_rack),
    is_pick: Boolean(p.is_pick),
    pick_note: Object.fromEntries(
      (["en", "ar", "ur", "hi"] as const).map((l) => [l, s(p.pick_note?.[l], 140)]).filter(([, v]) => v),
    ),
    colour_family: p.colour_family,
    colour_hex: s(p.colour_hex, 7).toUpperCase(),
    accent_hex: s(p.accent_hex, 7).toUpperCase(),
    occasions: Array.isArray(p.occasions) ? [...new Set(p.occasions)] : [],
  };
  const bad = (field: keyof ProductInput, error = "invalid") => ({ ok: false as const, error, field });
  if (!CODE.test(row.code)) return bad("code");
  if (row.brand.length < 1) return bad("brand");
  if (row.name.length < 2) return bad("name");
  if (row.fabric.length < 1) return bad("fabric");
  if (!(WORKS as readonly string[]).includes(row.work)) return bad("work");
  if (!(row.price_sar > 0 && row.price_sar <= 100000)) return bad("price_sar");
  if (!(row.sale_pct >= 0 && row.sale_pct <= 90)) return bad("sale_pct");
  if (row.cost_pkr !== null && !(row.cost_pkr >= 0 && row.cost_pkr <= 10_000_000)) return bad("cost_pkr");
  if (row.trending_rank !== null && !(row.trending_rank >= 1 && row.trending_rank <= 99)) return bad("trending_rank");
  if (!(FAMILIES as readonly string[]).includes(row.colour_family)) return bad("colour_family");
  if (!HEX.test(row.colour_hex)) return bad("colour_hex");
  if (!HEX.test(row.accent_hex)) return bad("accent_hex");
  if (row.occasions.length === 0 || row.occasions.some((o) => !(OCCASIONS as readonly string[]).includes(o))) return bad("occasions");
  const stock = int(p.stock);
  if (!(stock >= 0 && stock <= 100000)) return bad("stock");
  return { ok: true, row };
}

// Add or edit a product. Stock is never written directly: the difference is recorded as a stock
// movement ("receive shipment" for a new product, "adjustment" for an edit) and the database applies it.
export async function saveProduct(id: string | null, input: ProductInput): Promise<ActionResult<{ id: string }>> {
  const supabase = await catalogueClient();
  if (!supabase) return { ok: false, error: "forbidden" };
  const v = validate(input);
  if (!v.ok) return v;
  const target = Math.trunc(input.stock);

  let productId = id;
  let current = 0;
  if (id) {
    const { data: before, error: readErr } = await supabase.from("products").select("stock").eq("id", id).maybeSingle();
    if (readErr || !before) return { ok: false, error: "notFound" };
    current = before.stock;
    // The brand code can't change once orders may point at it.
    const changes: Partial<typeof v.row> = { ...v.row };
    delete changes.code;
    const { error } = await supabase.from("products").update(changes).eq("id", id);
    if (error) return /rack_full/.test(error.message) ? { ok: false, error: "rackFull", field: "on_rack" } : { ok: false, error: "saveFailed" };
  } else {
    const { data: last } = await supabase.from("products").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
    const { data, error } = await supabase
      .from("products")
      .insert({ ...v.row, sort_order: (last?.sort_order ?? 0) + 1 })
      .select("id")
      .single();
    if (error)
      return error.code === "23505"
        ? { ok: false, error: "codeTaken", field: "code" }
        : /rack_full/.test(error.message)
          ? { ok: false, error: "rackFull", field: "on_rack" }
          : { ok: false, error: "saveFailed" };
    productId = data.id;
  }

  const delta = target - current;
  if (delta !== 0 && productId) {
    const { data: me } = await supabase.auth.getUser();
    const { error } = await supabase.from("stock_movements").insert({
      product_id: productId,
      delta,
      reason: id ? "adjustment" : "receive_shipment",
      note: id ? "Edited in Products" : "Opening stock",
      created_by: me.user?.id ?? null,
    });
    if (error) return { ok: false, error: "stockFailed" };
  }

  revalidatePath("/admin/products");
  return { ok: true, id: productId! };
}

export async function setVisible(id: string, visible: boolean): Promise<ActionResult> {
  const supabase = await catalogueClient();
  if (!supabase) return { ok: false, error: "forbidden" };
  const { error, count } = await supabase.from("products").update({ visible: Boolean(visible) }, { count: "exact" }).eq("id", id);
  if (error || count === 0) return { ok: false, error: "saveFailed" };
  revalidatePath("/admin/products");
  return { ok: true };
}

const MAX_PHOTO = 3 * 1024 * 1024;
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "product";

// One photo, already resized in the browser (WebP, or JPEG where the browser can't make WebP).
// The file's own bytes are checked, not just the name or type the browser claims.
export async function uploadPhoto(form: FormData): Promise<ActionResult<{ photo: { id: string; storage_path: string; width: number; height: number; sort_order: number } }>> {
  const supabase = await catalogueClient();
  if (!supabase) return { ok: false, error: "forbidden" };
  const productId = String(form.get("productId") ?? "");
  const file = form.get("file");
  const width = Number(form.get("width"));
  const height = Number(form.get("height"));
  if (!(file instanceof File) || file.size === 0 || file.size > MAX_PHOTO) return { ok: false, error: "photoTooBig" };
  if (!(width > 0 && width <= 4000 && height > 0 && height <= 6000)) return { ok: false, error: "photoFailed" };

  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const isWebp = String.fromCharCode(...head.slice(0, 4)) === "RIFF" && String.fromCharCode(...head.slice(8, 12)) === "WEBP";
  const isJpeg = head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
  if (!isWebp && !isJpeg) return { ok: false, error: "photoFailed" };

  const { data: product } = await supabase.from("products").select("code, name").eq("id", productId).maybeSingle();
  if (!product) return { ok: false, error: "notFound" };
  const { data: last } = await supabase
    .from("product_images")
    .select("sort_order")
    .eq("product_id", productId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const path = `${slug(product.code)}/${crypto.randomUUID()}.${isWebp ? "webp" : "jpg"}`;
  const { error: upErr } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, file, { contentType: isWebp ? "image/webp" : "image/jpeg", cacheControl: "31536000", upsert: false });
  if (upErr) return { ok: false, error: "photoFailed" };

  const sort_order = (last?.sort_order ?? -1) + 1;
  const { data, error } = await supabase
    .from("product_images")
    .insert({ product_id: productId, storage_path: path, alt: product.name, is_model: true, width, height, sort_order })
    .select("id, storage_path, width, height, sort_order")
    .single();
  if (error) {
    await supabase.storage.from(PHOTO_BUCKET).remove([path]);
    return { ok: false, error: "photoFailed" };
  }
  revalidatePath("/admin/products");
  return { ok: true, photo: { ...data, width, height } };
}

// Put the photos in the chosen order (the first is the main photo on the website) and remove the dropped ones.
export async function arrangePhotos(productId: string, order: string[], remove: string[]): Promise<ActionResult> {
  const supabase = await catalogueClient();
  if (!supabase) return { ok: false, error: "forbidden" };
  const { data: photos, error } = await supabase.from("product_images").select("id, storage_path").eq("product_id", productId);
  if (error) return { ok: false, error: "saveFailed" };
  const mine = new Map((photos ?? []).map((p) => [p.id, p.storage_path]));

  const dropping = remove.filter((id) => mine.has(id));
  if (dropping.length) {
    const { error: delErr } = await supabase.from("product_images").delete().in("id", dropping);
    if (delErr) return { ok: false, error: "saveFailed" };
    await supabase.storage.from(PHOTO_BUCKET).remove(dropping.map((id) => mine.get(id)!));
  }
  const keep = order.filter((id) => mine.has(id) && !dropping.includes(id));
  for (const [i, id] of keep.entries()) {
    const { error: upErr } = await supabase.from("product_images").update({ sort_order: i }).eq("id", id);
    if (upErr) return { ok: false, error: "saveFailed" };
  }
  revalidatePath("/admin/products");
  return { ok: true };
}
