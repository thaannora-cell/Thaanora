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

const DEFAULTS: CheckoutSettings = { areas: [], giftBoxFee: 15, vatPct: 15 };

// Public settings only (RLS hides the private ones such as the PKR rate).
export async function getCheckoutSettings(): Promise<CheckoutSettings> {
  const supabase = getPublicClient();
  if (!supabase) return DEFAULTS;
  const { data } = await supabase
    .from("settings")
    .select("key, value")
    .in("key", ["delivery_fees", "gift_box_fee_sar", "vat_rate_pct"]);
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
  };
}
