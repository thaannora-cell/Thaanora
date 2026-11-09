import "server-only";
import { getPublicClient } from "@/lib/supabase/public";
import type { CheckoutSettings, DeliveryArea } from "@/lib/pricing";

export type Tailor = { id: string; name: string; area: string; member_price_note: string | null };

export async function getTailors(): Promise<Tailor[]> {
  const supabase = getPublicClient();
  if (!supabase) return [];
  const { data } = await supabase.from("tailors").select("id, name, area, member_price_note").order("sort_order");
  return (data ?? []) as Tailor[];
}

// The shop's WhatsApp number as digits for wa.me links, or null while it is still a placeholder.
export async function getWhatsappNumber(): Promise<string | null> {
  const supabase = getPublicClient();
  if (!supabase) return null;
  const { data } = await supabase.from("settings").select("value").eq("key", "whatsapp_number").maybeSingle();
  const digits = typeof data?.value === "string" ? data.value.replace(/\D/g, "") : "";
  return /^[1-9]\d{7,14}$/.test(digits) ? digits : null;
}

// Prices include VAT at vat_rate_pct (15%). At 0 the site hides all VAT wording.
const DEFAULTS: CheckoutSettings = { areas: [], giftBoxFee: 15, vatPct: 15, tailorDiscountPct: 10 };

// Public settings only (RLS hides the private ones such as the PKR rate).
export async function getCheckoutSettings(): Promise<CheckoutSettings> {
  const supabase = getPublicClient();
  if (!supabase) return DEFAULTS;
  const { data } = await supabase
    .from("settings")
    .select("key, value")
    .in("key", ["delivery_fees", "gift_box_fee_sar", "vat_rate_pct", "tailor_member_discount_pct"]);
  const get = (k: string) => data?.find((r) => r.key === k)?.value as unknown;

  const fees = get("delivery_fees");
  const areas: DeliveryArea[] = Array.isArray(fees)
    ? fees.flatMap((f) => {
        const area = (f as { area?: unknown }).area;
        const fee = Number((f as { fee_sar?: unknown }).fee_sar);
        return typeof area === "string" && Number.isFinite(fee) && fee >= 0 ? [{ area, fee }] : [];
      })
    : [];
  const num = (v: unknown, fallback: number) => (typeof v === "number" && v >= 0 ? v : fallback);

  return {
    areas,
    giftBoxFee: num(get("gift_box_fee_sar"), DEFAULTS.giftBoxFee),
    vatPct: num(get("vat_rate_pct"), DEFAULTS.vatPct),
    tailorDiscountPct: num(get("tailor_member_discount_pct"), DEFAULTS.tailorDiscountPct),
  };
}

export type SocialKey = "instagram" | "tiktok" | "snapchat";
export type SiteInfo = {
  whatsapp: string | null;
  social: { key: SocialKey; url: string }[];
  vatPct: number;
  business: { legalName: string; nationalNo: string; vat: string; address: string };
};

const SOCIAL_HOSTS: Record<SocialKey, string> = {
  instagram: "instagram.com",
  tiktok: "tiktok.com",
  snapchat: "snapchat.com",
};

// Only a real profile link counts: https on the network's own site, with a path
// (the seeded "https://www.instagram.com/" placeholders are hidden).
function profileUrl(key: SocialKey, value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const u = new URL(value.trim());
    const host = u.hostname.replace(/^www\./, "");
    const ok = u.protocol === "https:" && (host === SOCIAL_HOSTS[key] || host.endsWith(`.${SOCIAL_HOSTS[key]}`));
    return ok && u.pathname.replace(/\/+$/, "") !== "" ? u.toString() : null;
  } catch {
    return null;
  }
}

const text = (v: unknown, max = 160) => (typeof v === "string" ? v.trim().slice(0, max) : "");

// Footer, help button and policy pages: WhatsApp number, social links and business details.
export async function getSiteInfo(): Promise<SiteInfo> {
  const supabase = getPublicClient();
  const whatsapp = await getWhatsappNumber();
  const empty = { legalName: "", nationalNo: "", vat: "", address: "" };
  if (!supabase) return { whatsapp, social: [], vatPct: DEFAULTS.vatPct, business: empty };
  const { data } = await supabase.from("settings").select("key, value").in("key", ["social_links", "business", "vat_rate_pct"]);
  const raw = (k: string) => data?.find((r) => r.key === k)?.value as unknown;
  const get = (k: string) => (raw(k) ?? {}) as Record<string, unknown>;
  const vat = raw("vat_rate_pct");
  const links = get("social_links");
  const biz = get("business");
  const social = (Object.keys(SOCIAL_HOSTS) as SocialKey[]).flatMap((key) => {
    const url = profileUrl(key, links[key]);
    return url ? [{ key, url }] : [];
  });
  return {
    whatsapp,
    social,
    vatPct: typeof vat === "number" && vat >= 0 ? vat : DEFAULTS.vatPct,
    business: {
      legalName: text(biz.legal_name),
      nationalNo: text(biz.national_number, 40) || text(biz.cr_number, 40),
      vat: text(biz.vat_number, 40),
      address: text(biz.address),
    },
  };
}
