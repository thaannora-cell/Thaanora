import "server-only";
import { getSessionClient } from "@/lib/supabase/server";
import { dayEnd, dayStart, todayInRiyadh } from "./offers";
import type { OrderStatus } from "./dashboard";

// A sale is an order the customer confirmed: from Confirmed through to Delivered.
// Waiting orders aren't sales yet; refused and cancelled ones never became sales.
export const SALE_STATUSES: OrderStatus[] = ["confirmed", "packed", "with_courier", "delivered_cash_collected"];
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DAYS = 366;

const riyadhDay = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh" }).format(new Date(iso));
const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

export type Range = { from: string; to: string; days: string[] };

// Defaults to the last 30 days; swaps a reversed range; caps it at a year.
export function readRange(fromRaw?: string, toRaw?: string): Range {
  const today = todayInRiyadh();
  let to = toRaw && DAY.test(toRaw) && dayEnd(toRaw) ? toRaw : today;
  let from = fromRaw && DAY.test(fromRaw) && dayStart(fromRaw) ? fromRaw : addDays(to, -29);
  if (from > to) [from, to] = [to, from];
  if (to > today) to = today;
  if (from > to) from = to;
  const days: string[] = [];
  for (let d = from; d <= to && days.length < MAX_DAYS; d = addDays(d, 1)) days.push(d);
  return { from: days[0], to: days[days.length - 1], days };
}

export type OrderLine = { orderNo: string; day: string; status: OrderStatus; area: string; total: number; delivery: number; discount: number; code: string; name: string; brand: string; qty: number; unit: number };
type Item = { product_id: string | null; product_code: string; product_name: string; qty: number; unit_price_sar: number };
type OrderRow = {
  order_no: string;
  created_at: string;
  status: OrderStatus;
  area: string;
  total_sar: number;
  delivery_fee_sar: number;
  bundle_discount_sar: number;
  code_discount_sar: number;
  order_items: Item[];
};

// Orders placed in the range with their lines, read as the owner (RLS). No names or phone numbers.
export async function loadOrders(range: Range) {
  const supabase = await getSessionClient();
  const [orders, products] = await Promise.all([
    supabase
      .from("orders")
      .select("order_no, created_at, status, area, total_sar, delivery_fee_sar, bundle_discount_sar, code_discount_sar, order_items (product_id, product_code, product_name, qty, unit_price_sar)")
      .gte("created_at", dayStart(range.from)!)
      .lt("created_at", dayEnd(range.to)!)
      .order("created_at")
      .limit(5000),
    supabase.from("products").select("id, code, brand"),
  ]);
  const brandOf = new Map<string, string>();
  for (const p of products.data ?? []) {
    brandOf.set(p.id, p.brand);
    brandOf.set(`code:${p.code}`, p.brand);
  }
  return { orders: (orders.data ?? []) as OrderRow[], brandOf, failed: Boolean(orders.error) };
}

export function toLines(orders: OrderRow[], brandOf: Map<string, string>): OrderLine[] {
  return orders.flatMap((o) =>
    (o.order_items ?? []).map((i) => ({
      orderNo: o.order_no,
      day: riyadhDay(o.created_at),
      status: o.status,
      area: o.area,
      total: Number(o.total_sar),
      delivery: Number(o.delivery_fee_sar),
      discount: Number(o.bundle_discount_sar) + Number(o.code_discount_sar),
      code: i.product_code,
      name: i.product_name,
      brand: (i.product_id && brandOf.get(i.product_id)) || brandOf.get(`code:${i.product_code}`) || "—",
      qty: i.qty,
      unit: Number(i.unit_price_sar),
    })),
  );
}

export type Report = {
  range: Range;
  placed: number;
  sales: { orders: number; value: number; suits: number };
  byDay: { day: string; value: number; orders: number }[];
  byBrand: { brand: string; value: number; suits: number }[];
  best: { code: string; name: string; brand: string; suits: number; value: number }[];
  cod: {
    collected: { orders: number; value: number };
    onTheRoad: { orders: number; value: number };
    confirmed: { orders: number; value: number };
    waiting: { orders: number; value: number };
    refused: { orders: number; value: number };
    cancelled: { orders: number; value: number };
  };
  refusalRate: number | null;
  failed: boolean;
};

export async function getReport(range: Range): Promise<Report> {
  const { orders, brandOf, failed } = await loadOrders(range);
  const sale = orders.filter((o) => SALE_STATUSES.includes(o.status));
  const sum = (list: OrderRow[]) => ({ orders: list.length, value: list.reduce((s, o) => s + Number(o.total_sar), 0) });
  const by = (s: OrderStatus) => orders.filter((o) => o.status === s);

  const byDay = new Map(range.days.map((d) => [d, { day: d, value: 0, orders: 0 }]));
  for (const o of sale) {
    const d = byDay.get(riyadhDay(o.created_at));
    if (d) {
      d.value += Number(o.total_sar);
      d.orders += 1;
    }
  }

  const lines = toLines(sale, brandOf);
  const brands = new Map<string, { brand: string; value: number; suits: number }>();
  const suits = new Map<string, { code: string; name: string; brand: string; suits: number; value: number }>();
  for (const l of lines) {
    const b = brands.get(l.brand) ?? { brand: l.brand, value: 0, suits: 0 };
    b.value += l.unit * l.qty;
    b.suits += l.qty;
    brands.set(l.brand, b);
    const s = suits.get(l.code) ?? { code: l.code, name: l.name, brand: l.brand, suits: 0, value: 0 };
    s.suits += l.qty;
    s.value += l.unit * l.qty;
    suits.set(l.code, s);
  }

  const delivered = by("delivered_cash_collected").length;
  const refused = by("refused_at_door").length;
  return {
    range,
    placed: orders.length,
    sales: { ...sum(sale), suits: lines.reduce((n, l) => n + l.qty, 0) },
    byDay: [...byDay.values()],
    byBrand: [...brands.values()].sort((a, b) => b.value - a.value),
    best: [...suits.values()].sort((a, b) => b.suits - a.suits || b.value - a.value).slice(0, 10),
    cod: {
      collected: sum(by("delivered_cash_collected")),
      onTheRoad: sum(by("with_courier")),
      confirmed: sum([...by("confirmed"), ...by("packed")]),
      waiting: sum(by("waiting_confirmation")),
      refused: sum(by("refused_at_door")),
      cancelled: sum(by("cancelled")),
    },
    refusalRate: delivered + refused ? Math.round((refused / (delivered + refused)) * 100) : null,
    failed,
  };
}
