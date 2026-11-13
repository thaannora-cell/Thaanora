"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/admin/session";
import { canOpen } from "@/lib/admin/sections";
import { getSessionClient } from "@/lib/supabase/server";
import { issueCreditNote, recordRefund } from "@/lib/creditnotes";

export type ReturnActionResult = { ok: true } | { ok: false; error: "forbidden" | "saveFailed" | "badOrder" | "zoho"; message?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function allowed() {
  const session = await getSession();
  return session.state === "staff" && canOpen(session.staff.role, "returns");
}
const refresh = (id: string) => {
  revalidatePath("/admin/returns");
  revalidatePath(`/admin/returns/${id}`);
};

// Approve, reject, mark received (stock goes back), or cancel. The database checks the order of steps.
export async function setReturnStatus(id: string, status: "approved" | "rejected" | "received" | "cancelled", note: string): Promise<ReturnActionResult> {
  if (!(await allowed())) return { ok: false, error: "forbidden" };
  if (!UUID.test(id) || !["approved", "rejected", "received", "cancelled"].includes(status)) return { ok: false, error: "saveFailed" };
  const supabase = await getSessionClient();
  const staffNote = String(note ?? "").trim().slice(0, 600);
  const { error, count } = await supabase
    .from("returns")
    .update({ status, ...(staffNote ? { staff_note: staffNote } : {}) }, { count: "exact" })
    .eq("id", id);
  if (error || !count) return { ok: false, error: "saveFailed", message: error?.message };
  refresh(id);
  return { ok: true };
}

// Refund sent by bank transfer: make the Zoho credit note (and record the refund), then mark it refunded.
export async function refundReturn(id: string): Promise<ReturnActionResult> {
  if (!(await allowed())) return { ok: false, error: "forbidden" };
  if (!UUID.test(id)) return { ok: false, error: "saveFailed" };
  const made = await issueCreditNote(id);
  if (!made.ok) {
    refresh(id);
    return { ok: false, error: "zoho", message: made.error };
  }
  const supabase = await getSessionClient();
  const { error } = await supabase.from("returns").update({ status: "refunded" }).eq("id", id).eq("status", "received");
  refresh(id);
  return error ? { ok: false, error: "saveFailed", message: error.message } : { ok: true };
}

// Exchange: link the new order (placed for the exchange suit), make the credit note (kept open; it pays
// part of the new order's invoice), then mark it exchanged.
export async function exchangeReturn(id: string, orderNoRaw: string): Promise<ReturnActionResult> {
  if (!(await allowed())) return { ok: false, error: "forbidden" };
  const orderNo = String(orderNoRaw ?? "").trim().toUpperCase();
  if (!UUID.test(id) || !/^TH-\d{3,7}$/.test(orderNo)) return { ok: false, error: "badOrder" };
  const supabase = await getSessionClient();
  const [{ data: rt }, { data: next }] = await Promise.all([
    supabase.from("returns").select("order_id").eq("id", id).maybeSingle(),
    supabase.from("orders").select("id, status").eq("order_no", orderNo).maybeSingle(),
  ]);
  if (!rt || !next || next.id === rt.order_id || ["cancelled", "refused_at_door"].includes(next.status)) return { ok: false, error: "badOrder" };
  const link = await supabase.from("returns").update({ exchange_order_id: next.id }).eq("id", id);
  if (link.error) return { ok: false, error: "saveFailed", message: link.error.message };
  const made = await issueCreditNote(id);
  if (!made.ok) {
    refresh(id);
    return { ok: false, error: "zoho", message: made.error };
  }
  const { error } = await supabase.from("returns").update({ status: "exchanged" }).eq("id", id).eq("status", "received");
  refresh(id);
  return error ? { ok: false, error: "saveFailed", message: error.message } : { ok: true };
}

// Try again to record the bank-transfer refund in Zoho (after setting the refund account, say).
export async function retryRefundRecord(id: string): Promise<ReturnActionResult> {
  if (!(await allowed())) return { ok: false, error: "forbidden" };
  if (!UUID.test(id)) return { ok: false, error: "saveFailed" };
  const r = await recordRefund(id);
  refresh(id);
  return r.ok ? { ok: true } : { ok: false, error: "zoho", message: r.error };
}

// Save a staff note only.
export async function saveReturnNote(id: string, note: string): Promise<ReturnActionResult> {
  if (!(await allowed())) return { ok: false, error: "forbidden" };
  if (!UUID.test(id)) return { ok: false, error: "saveFailed" };
  const supabase = await getSessionClient();
  const { error, count } = await supabase.from("returns").update({ staff_note: String(note ?? "").trim().slice(0, 600) || null }, { count: "exact" }).eq("id", id);
  if (error || !count) return { ok: false, error: "saveFailed" };
  refresh(id);
  return { ok: true };
}
