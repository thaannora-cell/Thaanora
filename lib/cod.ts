import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

// COD protection (owner, 13 Nov 2026): cash on delivery is never blocked. After N refusals at the door
// in the last 12 months for the same mobile number (guests too), a new order is flagged "Call to confirm
// before sending". A customer tagged Trusted by staff is never flagged. N = 0 switches the rule off.
export async function needsCall(admin: SupabaseClient, phone: string): Promise<boolean> {
  const [{ data: setting }, { data: refusals }, { data: trusted }] = await Promise.all([
    admin.from("settings").select("value").eq("key", "cod_call_after_refusals").maybeSingle(),
    admin.rpc("refusal_count", { p_phone: phone }),
    admin.from("customers").select("id, customer_notes!inner (tags)").eq("phone", phone).contains("customer_notes.tags", ["trusted"]).limit(1),
  ]);
  const after = Number(setting?.value ?? 2);
  if (!Number.isInteger(after) || after <= 0) return false;
  if ((trusted ?? []).length > 0) return false;
  return typeof refusals === "number" && refusals >= after;
}
