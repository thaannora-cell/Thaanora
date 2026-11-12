"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/admin/session";
import { canOpen } from "@/lib/admin/sections";
import { getAdminClient } from "@/lib/supabase/admin";

async function staffId(): Promise<string | null> {
  const session = await getSession();
  return session.state === "staff" && canOpen(session.staff.role, "notifications") ? session.staff.id : null;
}

// Tick a WhatsApp message off the list: "sent" (opened and sent) or "skipped" (not needed).
// The secret key writes it, after the role check, so customers can't touch these fields.
export async function markWhatsapp(id: string, outcome: "sent" | "skipped"): Promise<{ ok: boolean }> {
  const by = await staffId();
  if (!by || (outcome !== "sent" && outcome !== "skipped")) return { ok: false };
  const db = getAdminClient();
  if (!db) return { ok: false };
  const { error } = await db
    .from("notifications")
    .update({ whatsapp_status: outcome, whatsapp_done_at: new Date().toISOString(), whatsapp_done_by: by })
    .eq("id", id)
    .eq("whatsapp_status", "pending");
  revalidatePath("/admin/notifications");
  revalidatePath("/admin");
  return { ok: !error };
}

// Sending the status message from the order page also ticks off that order's waiting WhatsApp items.
export async function markOrderWhatsappSent(orderNo: string): Promise<void> {
  const by = await staffId();
  if (!by || !/^TH-\d{3,7}$/.test(orderNo)) return;
  const db = getAdminClient();
  if (!db) return;
  await db
    .from("notifications")
    .update({ whatsapp_status: "sent", whatsapp_done_at: new Date().toISOString(), whatsapp_done_by: by })
    .eq("type", "order_status")
    .eq("whatsapp_status", "pending")
    .eq("data->>orderNo", orderNo);
  revalidatePath("/admin/notifications");
  revalidatePath("/admin");
}
