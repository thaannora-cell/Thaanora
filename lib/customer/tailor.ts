import "server-only";
import { getAdminClient } from "@/lib/supabase/admin";
import { cleanMeasurements, type Measurements } from "@/lib/measurements";

export type NetworkTailor = { id: string; name: string; area: string; note: string | null; pct: number | null; whatsapp: string | null };

// Her chosen tailor and measurements. Only call with the id from getAccount().
export async function myTailorData(customerId: string): Promise<{ tailorId: string | null; measurements: Measurements }> {
  const db = getAdminClient();
  if (!db) return { tailorId: null, measurements: {} };
  const { data } = await db.from("customers").select("tailor_id, measurements").eq("id", customerId).maybeSingle();
  return { tailorId: data?.tailor_id ?? null, measurements: cleanMeasurements(data?.measurements) };
}

// The visible tailor network with each tailor's WhatsApp (digits) for signed-in customers only:
// customers contact the tailor themselves. Website visitors never get these numbers.
export async function tailorNetwork(): Promise<NetworkTailor[]> {
  const db = getAdminClient();
  if (!db) return [];
  const { data } = await db.from("tailors").select("id, name, area, member_price_note, member_pct, phone").eq("visible", true).order("sort_order");
  return (data ?? []).map((t) => {
    const digits = typeof t.phone === "string" ? t.phone.replace(/\D/g, "") : "";
    return {
      id: t.id,
      name: t.name,
      area: t.area,
      note: t.member_price_note,
      pct: t.member_pct,
      whatsapp: /^[1-9]\d{7,14}$/.test(digits) ? digits : null,
    };
  });
}
