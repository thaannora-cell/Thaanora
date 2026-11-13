"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/admin/session";
import { canOpen } from "@/lib/admin/sections";
import { getSessionClient } from "@/lib/supabase/server";
import { isTag } from "@/lib/admin/customers";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function allowed() {
  const session = await getSession();
  return session.state === "staff" && canOpen(session.staff.role, "customers");
}

// Staff-only tags and notes about a customer (she never sees them).
export async function saveCustomerNotes(id: string, tags: string[], notes: string): Promise<{ ok: boolean }> {
  if (!(await allowed()) || !UUID.test(id)) return { ok: false };
  const clean = [...new Set((Array.isArray(tags) ? tags : []).filter(isTag))];
  const supabase = await getSessionClient();
  const { error } = await supabase
    .from("customer_notes")
    .upsert({ customer_id: id, tags: clean, notes: String(notes ?? "").trim().slice(0, 1000) || null }, { onConflict: "customer_id" });
  revalidatePath(`/admin/customers/${id}`);
  revalidatePath("/admin/customers");
  return { ok: !error };
}

// Reactivate (or deactivate) her My Thaanora profile, e.g. when she asks on WhatsApp.
export async function setCustomerStatus(id: string, status: "active" | "deactivated"): Promise<{ ok: boolean }> {
  if (!(await allowed()) || !UUID.test(id) || !["active", "deactivated"].includes(status)) return { ok: false };
  const supabase = await getSessionClient();
  const { error, count } = await supabase.from("customers").update({ status }, { count: "exact" }).eq("id", id);
  revalidatePath(`/admin/customers/${id}`);
  return { ok: !error && Boolean(count) };
}
