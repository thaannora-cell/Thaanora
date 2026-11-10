import "server-only";
import { getSessionClient } from "@/lib/supabase/server";

export type AdminTailor = {
  id: string;
  name: string;
  area: string;
  phone: string | null;
  memberPct: number | null; // null = shop-wide default
  note: string | null;
  visible: boolean;
};

export async function getTailorsPage() {
  const supabase = await getSessionClient();
  const [tailors, settings] = await Promise.all([
    supabase.from("tailors").select("id, name, area, phone, member_pct, member_price_note, visible, sort_order").order("sort_order").order("created_at"),
    supabase.from("settings").select("key, value").in("key", ["tailor_member_discount_pct", "delivery_fees"]),
  ]);
  const get = (k: string) => settings.data?.find((r) => r.key === k)?.value as unknown;
  const fees = get("delivery_fees");
  const areas = Array.isArray(fees) ? fees.map((f) => String((f as { area?: unknown }).area ?? "")).filter(Boolean) : [];
  const pct = Number(get("tailor_member_discount_pct"));
  return {
    tailors: (tailors.data ?? []).map((t) => ({
      id: t.id,
      name: t.name,
      area: t.area,
      phone: t.phone,
      memberPct: t.member_pct ?? null,
      note: t.member_price_note,
      visible: t.visible,
    })) as AdminTailor[],
    defaultPct: Number.isFinite(pct) && pct >= 0 ? pct : 10,
    areas: [...new Set([...areas, ...(tailors.data ?? []).map((t) => t.area)])],
    failed: Boolean(tailors.error),
  };
}
