import "server-only";
import { getSessionClient } from "@/lib/supabase/server";

export type SettingsForm = {
  whatsapp: string;
  instagram: string;
  tiktok: string;
  snapchat: string;
  fees: { area: string; fee: number }[];
  legalName: string;
  entityType: string;
  nationalNo: string;
  vatNo: string;
  address: string;
  pkrRate: number | null;
  lowStock: number;
  signinMethod: "email" | "sms" | "both";
  requireSignIn: boolean;
  birthdayPct: number;
  returnDays: number;
  refundAccount: string;
  codCallAfter: number;
};

// Every setting, public and private, read as the owner (RLS: "owner writes settings").
export async function getSettingsForm(): Promise<{ form: SettingsForm; failed: boolean }> {
  const supabase = await getSessionClient();
  const { data, error } = await supabase.from("settings").select("key, value");
  const get = (k: string) => data?.find((r) => r.key === k)?.value as unknown;
  const obj = (k: string) => ((get(k) ?? {}) as Record<string, unknown>) || {};
  const s = (v: unknown) => (typeof v === "string" ? v : "");
  const social = obj("social_links");
  const biz = obj("business");
  const fees = get("delivery_fees");
  const rate = Number(get("pkr_per_sar"));
  const low = Number(get("low_stock_level"));
  return {
    form: {
      whatsapp: s(get("whatsapp_number")),
      instagram: s(social.instagram),
      tiktok: s(social.tiktok),
      snapchat: s(social.snapchat),
      fees: Array.isArray(fees)
        ? fees.map((f) => ({ area: s((f as { area?: unknown }).area), fee: Number((f as { fee_sar?: unknown }).fee_sar) || 0 })).filter((f) => f.area)
        : [],
      legalName: s(biz.legal_name),
      entityType: s(biz.entity_type),
      nationalNo: s(biz.national_number) || s(biz.cr_number),
      vatNo: s(biz.vat_number),
      address: s(biz.address),
      pkrRate: Number.isFinite(rate) && rate > 0 ? rate : null,
      lowStock: Number.isFinite(low) && low >= 0 ? low : 3,
      signinMethod: (["email", "sms", "both"] as const).find((m) => m === get("customer_signin_method")) ?? "email",
      requireSignIn: get("require_signin_to_order") === true,
      birthdayPct: Number.isFinite(Number(get("birthday_gift_pct"))) ? Number(get("birthday_gift_pct")) : 5,
      returnDays: Number.isInteger(Number(get("return_window_days"))) ? Number(get("return_window_days")) : 3,
      refundAccount: s(get("zoho_refund_account_id")),
      codCallAfter: Number.isInteger(Number(get("cod_call_after_refusals"))) ? Number(get("cod_call_after_refusals")) : 2,
    },
    failed: Boolean(error),
  };
}
