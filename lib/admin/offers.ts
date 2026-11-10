import "server-only";
import { getSessionClient } from "@/lib/supabase/server";
import { isLiveNow } from "@/lib/campaign-pricing";

// ── Dates: the owner picks whole days in Riyadh. A start date begins at 00:00 Riyadh; an end date
//    is the last full day, so the offer stops at 00:00 Riyadh the day after. ──
const DAY = /^\d{4}-\d{2}-\d{2}$/;
export const dayStart = (d: string) => (DAY.test(d) ? new Date(`${d}T00:00:00+03:00`).toISOString() : null);
export const dayEnd = (d: string) => (DAY.test(d) ? new Date(Date.parse(`${d}T00:00:00+03:00`) + 86_400_000).toISOString() : null);
const riyadhDay = (ms: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh" }).format(new Date(ms));
export const toDayStart = (iso: string | null) => (iso ? riyadhDay(Date.parse(iso)) : "");
export const toDayEnd = (iso: string | null) => (iso ? riyadhDay(Date.parse(iso) - 1) : "");
export const todayInRiyadh = () => riyadhDay(Date.now());

export type CodeRow = {
  id: string;
  code: string;
  percent: number;
  note: string | null;
  active: boolean;
  endDay: string;
  usageLimit: number | null;
  used: number;
  state: "live" | "paused" | "ended" | "usedUp" | "scheduled";
};
export type BrandRow = { brand: string; suits: number; onSale: number; salePct: number | null };

export type OffersPage = {
  bundle: { active: boolean; qty: number; pct: number } | null;
  codes: CodeRow[];
  brands: BrandRow[];
  failed: boolean;
};

export async function getOffersPage(): Promise<OffersPage> {
  const supabase = await getSessionClient();
  const [offers, products] = await Promise.all([
    supabase.from("offers").select("id, kind, code, percent, min_qty, note, active, starts_at, ends_at, usage_limit, used_count, created_at").order("created_at"),
    supabase.from("products").select("brand, sale_pct"),
  ]);
  const rows = offers.data ?? [];
  const bundleRow = rows.filter((o) => o.kind === "bundle").sort((a, b) => Number(b.active) - Number(a.active))[0];
  const now = Date.now();

  const byBrand = new Map<string, number[]>();
  for (const p of products.data ?? []) byBrand.set(p.brand, [...(byBrand.get(p.brand) ?? []), p.sale_pct]);

  return {
    bundle: bundleRow ? { active: bundleRow.active, qty: bundleRow.min_qty ?? 3, pct: bundleRow.percent } : null,
    codes: rows
      .filter((o) => o.kind === "code")
      .reverse()
      .map((o) => ({
        id: o.id,
        code: o.code,
        percent: o.percent,
        note: o.note,
        active: o.active,
        endDay: toDayEnd(o.ends_at),
        usageLimit: o.usage_limit,
        used: o.used_count,
        state: !o.active
          ? "paused"
          : o.ends_at && Date.parse(o.ends_at) <= now
            ? "ended"
            : o.usage_limit != null && o.used_count >= o.usage_limit
              ? "usedUp"
              : o.starts_at && Date.parse(o.starts_at) > now
                ? "scheduled"
                : "live",
      })),
    brands: [...byBrand.entries()]
      .map(([brand, sales]) => {
        const onSale = sales.filter((s) => s > 0);
        const same = onSale.length === sales.length && new Set(sales).size === 1;
        return { brand, suits: sales.length, onSale: onSale.length, salePct: same ? sales[0] : null };
      })
      .sort((a, b) => a.brand.localeCompare(b.brand)),
    failed: Boolean(offers.error || products.error),
  };
}

export type Title = { en: string; ar: string; ur: string; hi: string };
export type CampaignRow = {
  id: string;
  title: Title;
  percent: number;
  occasion: string | null;
  active: boolean;
  fromDay: string;
  toDay: string;
  state: "live" | "scheduled" | "ended" | "off";
};
export type SeasonsPage = {
  campaigns: CampaignRow[];
  brandOfMonth: string;
  brands: string[];
  messages: Title[];
  failed: boolean;
};

const asTitle = (t: unknown): Title => {
  const o = (t ?? {}) as Partial<Title>;
  return { en: o.en ?? "", ar: o.ar ?? "", ur: o.ur ?? "", hi: o.hi ?? "" };
};

export async function getSeasonsPage(): Promise<SeasonsPage> {
  const supabase = await getSessionClient();
  const [camps, products] = await Promise.all([
    supabase.from("campaigns").select("id, kind, title, brand, occasion, percent, active, starts_at, ends_at, sort_order").order("sort_order").order("created_at"),
    supabase.from("products").select("brand"),
  ]);
  const rows = camps.data ?? [];
  const now = Date.now();
  const bom = rows.find((r) => r.kind === "brand_of_month" && r.active);
  return {
    campaigns: rows
      .filter((r) => r.kind === "campaign")
      .map((r) => ({
        id: r.id,
        title: asTitle(r.title),
        percent: r.percent ?? 0,
        occasion: r.occasion,
        active: r.active,
        fromDay: toDayStart(r.starts_at),
        toDay: toDayEnd(r.ends_at),
        state: !r.active ? "off" : isLiveNow(r, now) ? "live" : r.starts_at && Date.parse(r.starts_at) > now ? "scheduled" : "ended",
      })),
    brandOfMonth: bom?.brand ?? "",
    brands: [...new Set((products.data ?? []).map((p) => p.brand))].sort(),
    messages: rows.filter((r) => r.kind === "topbar_message" && r.active).map((r) => asTitle(r.title)),
    failed: Boolean(camps.error),
  };
}
