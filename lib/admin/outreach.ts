import "server-only";
import { getAdminClient } from "@/lib/supabase/admin";
import { getSessionClient } from "@/lib/supabase/server";
import { getLevels } from "@/lib/customer/perks";
import { levelFor, riyadhToday } from "@/lib/circle";

export const SEGMENTS = ["all", "level", "brand", "inactive", "birthday_month", "customer"] as const;
export type Segment = (typeof SEGMENTS)[number];
export const isSegment = (v: unknown): v is Segment => typeof v === "string" && (SEGMENTS as readonly string[]).includes(v);
export const INACTIVE_DAYS = 60;

// Who is in a segment: active My Thaanora customers only. Runs with the secret key, so call it only
// after checking the owner's session.
export async function segmentCustomers(segment: Segment, value: string | null): Promise<string[]> {
  const db = getAdminClient();
  if (!db) return [];
  const active = async (ids?: string[]) => {
    let q = db.from("customers").select("id, birthday").eq("status", "active").limit(5000);
    if (ids) q = q.in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    return (await q).data ?? [];
  };
  if (segment === "all") return (await active()).map((c) => c.id);
  if (segment === "customer") return value && /^[0-9a-f-]{36}$/i.test(value) ? (await active([value])).map((c) => c.id) : [];
  if (segment === "birthday_month") {
    const month = riyadhToday().slice(5, 7);
    return (await active()).filter((c) => c.birthday && c.birthday.slice(5, 7) === month).map((c) => c.id);
  }
  if (segment === "brand") {
    if (!value) return [];
    const { data } = await db.from("favorites").select("customer_id, products!inner (brand)").eq("products.brand", value).limit(5000);
    return (await active([...new Set((data ?? []).map((f) => f.customer_id as string))])).map((c) => c.id);
  }
  const { data: stats } = await db.from("customer_stats").select("customer_id, suits_12m, last_order_at").limit(5000);
  if (segment === "level") {
    const levels = await getLevels();
    const ids = (stats ?? []).filter((s) => (levelFor(s.suits_12m, levels).current?.slug ?? "none") === value).map((s) => s.customer_id);
    return (await active(ids)).map((c) => c.id);
  }
  // inactive: ordered before, but not in the last 60 days
  const cutoff = Date.now() - INACTIVE_DAYS * 86400000;
  const ids = (stats ?? []).filter((s) => s.last_order_at && Date.parse(s.last_order_at) < cutoff).map((s) => s.customer_id);
  return (await active(ids)).map((c) => c.id);
}

export type OutreachRow = {
  id: string;
  kind: "announcement" | "offer";
  segment: Segment;
  segmentValue: string | null;
  title: string;
  percent: number | null;
  endsAt: string | null;
  recipients: number;
  used: number; // offers: how many were used on an order (not cancelled/refused)
  createdAt: string;
};

// The send log (owner; RLS).
export async function listOutreach(limit = 30): Promise<OutreachRow[]> {
  const supabase = await getSessionClient();
  const { data } = await supabase.from("outreach").select("id, kind, segment, segment_value, title, percent, ends_at, recipients, created_at").order("created_at", { ascending: false }).limit(limit);
  const rows = data ?? [];
  const offerIds = rows.filter((r) => r.kind === "offer").map((r) => r.id);
  const used = new Map<string, number>();
  if (offerIds.length) {
    const db = getAdminClient();
    const { data: offers } = db ? await db.from("customer_offers").select("id, outreach_id").in("outreach_id", offerIds) : { data: [] };
    const byOffer = new Map((offers ?? []).map((o) => [o.id, o.outreach_id as string]));
    if (db && byOffer.size) {
      const { data: orders } = await db.from("orders").select("customer_offer_id").in("customer_offer_id", [...byOffer.keys()]).not("status", "in", "(cancelled,refused_at_door)");
      for (const o of orders ?? []) {
        const k = byOffer.get(o.customer_offer_id);
        if (k) used.set(k, (used.get(k) ?? 0) + 1);
      }
    }
  }
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    segment: r.segment,
    segmentValue: r.segment_value,
    title: (r.title?.en as string) || (Object.values(r.title ?? {})[0] as string) || "",
    percent: r.percent === null ? null : Number(r.percent),
    endsAt: r.ends_at,
    recipients: r.recipients,
    used: used.get(r.id) ?? 0,
    createdAt: r.created_at,
  }));
}

// Brands customers have saved (for the "brand fans" segment).
export async function favouriteBrands(): Promise<string[]> {
  const db = getAdminClient();
  if (!db) return [];
  const { data } = await db.from("favorites").select("products!inner (brand)").limit(5000);
  type R = { products: { brand: string } | null };
  return [...new Set(((data ?? []) as unknown as R[]).map((f) => f.products?.brand).filter((b): b is string => Boolean(b)))].sort();
}
