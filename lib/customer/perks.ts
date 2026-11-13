import "server-only";
import { cache } from "react";
import { getAdminClient } from "@/lib/supabase/admin";
import { getPublicClient } from "@/lib/supabase/public";
import { birthdayWindow, levelFor, riyadhToday, type Level, type Perk } from "@/lib/circle";
import type { CheckoutPerks } from "@/lib/pricing";

export type PersonalOffer = { id: string; pct: number; title: Partial<Record<string, string>>; endsAt: string | null };
export type BirthdayGift = { pct: number; year: number; date: string; start: string; end: string; open: boolean; used: boolean };

export type Perks = {
  suits: number; // delivered in the last 12 months
  levels: Level[];
  current: Level | null;
  next: Level | null;
  toNext: number;
  birthday: BirthdayGift | null; // null when she hasn't given a birthday or the gift is switched off
  offers: PersonalOffer[]; // usable now
};

const PERKS: Perk[] = ["early_sale", "eid_gift", "priority_sourcing"];
const LIVE = ["cancelled", "refused_at_door"];

// The Circle levels (public), lowest first.
export const getLevels = cache(async (): Promise<Level[]> => {
  const db = getPublicClient();
  if (!db) return [];
  const { data } = await db.from("loyalty_levels").select("slug, min_suits, discount_pct, free_gift_box, perks").eq("active", true).order("min_suits");
  return (data ?? []).map((l) => ({
    slug: l.slug,
    minSuits: l.min_suits,
    pct: Number(l.discount_pct),
    freeGiftBox: l.free_gift_box,
    perks: ((l.perks ?? []) as string[]).filter((p): p is Perk => (PERKS as string[]).includes(p)),
  }));
});

export const getBirthdayPct = cache(async (): Promise<number> => {
  const db = getPublicClient();
  if (!db) return 0;
  const { data } = await db.from("settings").select("value").eq("key", "birthday_gift_pct").maybeSingle();
  const n = Number(data?.value);
  return Number.isFinite(n) && n > 0 && n <= 50 ? n : 0;
});

// Only ever call with the id and birthday from getAccount() (her session), never from the browser.
export const getPerks = cache(async (customerId: string, birthday: string | null): Promise<Perks> => {
  const db = getAdminClient();
  const [levels, birthdayPct] = await Promise.all([getLevels(), getBirthdayPct()]);
  const empty: Perks = { suits: 0, levels, ...levelFor(0, levels), birthday: null, offers: [] };
  if (!db) return empty;

  const today = riyadhToday();
  const win = birthday && birthdayPct > 0 ? birthdayWindow(birthday, today) : null;
  const now = Date.now();
  const [count, offersRes, usedOffersRes, birthdayUsedRes] = await Promise.all([
    db.rpc("customer_suit_count", { p_customer: customerId }),
    db
      .from("customer_offers")
      .select("id, percent, title, starts_at, ends_at")
      .eq("customer_id", customerId)
      .eq("active", true)
      .order("percent", { ascending: false }),
    db.from("orders").select("customer_offer_id").eq("customer_id", customerId).eq("discount_kind", "personal").not("status", "in", `(${LIVE.join(",")})`),
    win
      ? db.from("orders").select("id", { count: "exact", head: true }).eq("customer_id", customerId).eq("discount_kind", "birthday").eq("birthday_year", win.year).not("status", "in", `(${LIVE.join(",")})`)
      : Promise.resolve({ count: 0 }),
  ]);
  const suits = typeof count.data === "number" ? count.data : 0;
  const used = new Set((usedOffersRes.data ?? []).map((o) => o.customer_offer_id));
  const offers = (offersRes.data ?? [])
    .filter((o) => !used.has(o.id) && (!o.starts_at || Date.parse(o.starts_at) <= now) && (!o.ends_at || Date.parse(o.ends_at) > now))
    .map((o) => ({ id: o.id, pct: Number(o.percent), title: (o.title ?? {}) as Partial<Record<string, string>>, endsAt: o.ends_at }));

  return {
    suits,
    levels,
    ...levelFor(suits, levels),
    birthday: win ? { pct: birthdayPct, ...win, used: (birthdayUsedRes.count ?? 0) > 0 } : null,
    offers,
  };
});

export type UsedDiscount = { orderNo: string; createdAt: string; kind: string; pct: number | null; level: string | null; amount: number; code: string | null };

// Her orders that used a discount (newest first), for "Gifts and discounts you've had". Cancelled and
// refused orders are left out.
export async function myDiscountHistory(customerId: string, limit = 10): Promise<UsedDiscount[]> {
  const db = getAdminClient();
  if (!db) return [];
  const { data } = await db
    .from("orders")
    .select("order_no, created_at, discount_kind, discount_pct, loyalty_level, discount_code, bundle_discount_sar, code_discount_sar, perk_discount_sar")
    .eq("customer_id", customerId)
    .not("discount_kind", "is", null)
    .not("status", "in", `(${LIVE.join(",")})`)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((o) => ({
    orderNo: o.order_no,
    createdAt: o.created_at,
    kind: o.discount_kind,
    pct: o.discount_pct === null ? null : Number(o.discount_pct),
    level: o.loyalty_level,
    code: o.discount_code,
    amount: Number(o.bundle_discount_sar) + Number(o.code_discount_sar) + Number(o.perk_discount_sar ?? 0),
  }));
}

// The part the checkout needs (sent to her browser; nothing private beyond her own offers).
export function toCheckoutPerks(p: Perks): CheckoutPerks {
  return {
    level: p.current ? { slug: p.current.slug, pct: p.current.pct } : null,
    freeGiftBox: p.current?.freeGiftBox ?? false,
    birthday: p.birthday && p.birthday.open && !p.birthday.used ? { pct: p.birthday.pct, year: p.birthday.year } : null,
    offers: p.offers.map((o) => ({ id: o.id, pct: o.pct })),
  };
}
