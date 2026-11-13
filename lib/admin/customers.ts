import "server-only";
import { getSessionClient } from "@/lib/supabase/server";
import { getLevels } from "@/lib/customer/perks";
import { levelFor } from "@/lib/circle";

export const CUSTOMER_TAGS = ["vip", "wholesale", "trusted"] as const;
export type CustomerTag = (typeof CUSTOMER_TAGS)[number];
export const isTag = (v: unknown): v is CustomerTag => typeof v === "string" && (CUSTOMER_TAGS as readonly string[]).includes(v);

export type CustomerRow = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  status: "active" | "deactivated";
  joinedAt: string;
  tags: CustomerTag[];
  orders: number;
  spent: number;
  suits12m: number;
  level: string | null;
  lastOrderAt: string | null;
  refusals: number;
};

type Stats = { customer_id: string; orders: number; total_spent: number; suits_12m: number; last_order_at: string | null; refusals_12m: number };
type Base = { id: string; name: string; phone: string; email: string | null; status: "active" | "deactivated"; created_at: string; customer_notes: { tags: string[] | null; notes: string | null } | null };

const twelveMonthsAgo = () => new Date(Date.now() - 365 * 86400000).toISOString();

async function rows(base: Base[], stats: Stats[]): Promise<CustomerRow[]> {
  const levels = await getLevels();
  const byId = new Map(stats.map((s) => [s.customer_id, s]));
  return base.map((c) => {
    const s = byId.get(c.id);
    const suits = s?.suits_12m ?? 0;
    return {
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      status: c.status,
      joinedAt: c.created_at,
      tags: (c.customer_notes?.tags ?? []).filter(isTag),
      orders: s?.orders ?? 0,
      spent: Number(s?.total_spent ?? 0),
      suits12m: suits,
      level: levelFor(suits, levels).current?.slug ?? null,
      lastOrderAt: s?.last_order_at ?? null,
      refusals: s?.refusals_12m ?? 0,
    };
  });
}

export type CustomerFilter = { q: string; tag: CustomerTag | null; level: string | null; sort: "recent" | "spent" | "orders" };

// Read as the signed-in staff member (RLS: owner and orders team).
export async function listCustomers(f: CustomerFilter): Promise<{ customers: CustomerRow[]; total: number; failed: boolean }> {
  const supabase = await getSessionClient();
  let q = supabase.from("customers").select("id, name, phone, email, status, created_at, customer_notes (tags, notes)").order("created_at", { ascending: false }).limit(500);
  const term = f.q.replace(/[^\p{L}\p{N}@.+\- ]/gu, "").trim().slice(0, 60);
  if (term) {
    const digits = term.replace(/\D/g, "");
    const parts = [`name.ilike.%${term}%`, `email.ilike.%${term}%`];
    if (digits.length >= 4) parts.push(`phone.ilike.%${digits.slice(-9)}%`);
    q = q.or(parts.join(","));
  }
  const [base, stats] = await Promise.all([q, supabase.from("customer_stats").select("customer_id, orders, total_spent, suits_12m, last_order_at, refusals_12m")]);
  let list = await rows((base.data ?? []) as unknown as Base[], (stats.data ?? []) as Stats[]);
  const total = list.length;
  if (f.tag) list = list.filter((c) => c.tags.includes(f.tag!));
  if (f.level) list = list.filter((c) => (f.level === "none" ? c.level === null : c.level === f.level));
  if (f.sort === "spent") list.sort((a, b) => b.spent - a.spent);
  if (f.sort === "orders") list.sort((a, b) => b.orders - a.orders);
  if (f.sort === "recent") list.sort((a, b) => (b.lastOrderAt ?? b.joinedAt).localeCompare(a.lastOrderAt ?? a.joinedAt));
  return { customers: list, total, failed: Boolean(base.error || stats.error) };
}

export type CustomerProfile = CustomerRow & {
  language: string;
  birthday: string | null;
  notes: string | null;
  orderList: { orderNo: string; createdAt: string; status: string; total: number; needsCall: boolean }[];
  favourites: { code: string; name: string }[];
  requests: { id: string; type: string; status: string; createdAt: string }[];
  returns: { id: string; returnNo: string; status: string; refund: number }[];
  reviews: { rating: number; status: string; product: string }[];
  addresses: number;
};

export async function getCustomer(id: string): Promise<CustomerProfile | null> {
  const supabase = await getSessionClient();
  const { data: c } = await supabase.from("customers").select("id, name, phone, email, status, created_at, language, birthday, customer_notes (tags, notes)").eq("id", id).maybeSingle();
  if (!c) return null;
  const [stats, orders, favs, reqs, rets, revs, addr] = await Promise.all([
    supabase.from("customer_stats").select("customer_id, orders, total_spent, suits_12m, last_order_at, refusals_12m").eq("customer_id", id),
    supabase.from("orders").select("order_no, created_at, status, total_sar, needs_call").eq("customer_id", id).order("created_at", { ascending: false }).limit(50),
    supabase.from("favorites").select("products (code, name)").eq("customer_id", id).limit(50),
    supabase.from("requests").select("id, type, status, created_at").eq("customer_id", id).order("created_at", { ascending: false }).limit(20),
    supabase.from("returns").select("id, return_no, status, refund_sar").eq("customer_id", id).order("created_at", { ascending: false }).limit(20),
    supabase.from("reviews").select("rating, status, products (name)").eq("customer_id", id).limit(20),
    supabase.from("addresses").select("id", { count: "exact", head: true }).eq("customer_id", id),
  ]);
  const [row] = await rows([c as unknown as Base], (stats.data ?? []) as Stats[]);
  const notes = (c as unknown as Base).customer_notes;
  type P = { code: string; name: string } | null;
  return {
    ...row,
    language: c.language,
    birthday: c.birthday,
    notes: notes?.notes ?? null,
    orderList: (orders.data ?? []).map((o) => ({ orderNo: o.order_no, createdAt: o.created_at, status: o.status, total: Number(o.total_sar), needsCall: o.needs_call === true })),
    favourites: ((favs.data ?? []) as unknown as { products: P }[]).flatMap((f) => (f.products ? [f.products] : [])),
    requests: (reqs.data ?? []).map((r) => ({ id: r.id, type: r.type, status: r.status, createdAt: r.created_at })),
    returns: (rets.data ?? []).map((r) => ({ id: r.id, returnNo: r.return_no, status: r.status, refund: Number(r.refund_sar) })),
    reviews: ((revs.data ?? []) as unknown as { rating: number; status: string; products: { name: string } | null }[]).map((r) => ({ rating: r.rating, status: r.status, product: r.products?.name ?? "" })),
    addresses: addr.count ?? 0,
  };
}

// For an order page: refusals at the door for this mobile (12 months), her tags, and her profile id.
export async function orderCustomerFacts(phone: string, customerId: string | null): Promise<{ refusals: number; tags: CustomerTag[] }> {
  const supabase = await getSessionClient();
  const [ref, notes] = await Promise.all([
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("customer_phone", phone).eq("status", "refused_at_door").gt("status_changed_at", twelveMonthsAgo()),
    customerId ? supabase.from("customer_notes").select("tags").eq("customer_id", customerId).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  return { refusals: ref.count ?? 0, tags: ((notes.data?.tags ?? []) as string[]).filter(isTag) };
}
