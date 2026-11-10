"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/admin/session";
import { canOpen } from "@/lib/admin/sections";
import { getSessionClient } from "@/lib/supabase/server";
import { isReqStatus } from "@/lib/admin/requests";
import type { FormResult } from "../offers/actions";

export async function setRequestStatus(id: string, status: string): Promise<FormResult> {
  const session = await getSession();
  if (session.state !== "staff" || !canOpen(session.staff.role, "requests")) return { ok: false, error: "forbidden", at: Date.now() };
  if (!isReqStatus(status)) return { ok: false, error: "saveFailed", at: Date.now() };
  const supabase = await getSessionClient();
  const { error, count } = await supabase.from("requests").update({ status }, { count: "exact" }).eq("id", id);
  if (error || !count) return { ok: false, error: "saveFailed", at: Date.now() };
  revalidatePath("/admin/requests");
  revalidatePath(`/admin/requests/${id}`);
  revalidatePath("/admin");
  return { ok: true, at: Date.now() };
}
