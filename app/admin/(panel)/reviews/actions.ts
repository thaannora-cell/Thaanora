"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/admin/session";
import { canOpen } from "@/lib/admin/sections";
import { getSessionClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Publish or hide a review, and optionally save a reply (empty reply removes it). Owner and catalogue team.
export async function moderateReview(id: string, status: "published" | "hidden" | null, reply: string | null): Promise<{ ok: boolean }> {
  const session = await getSession();
  if (session.state !== "staff" || !canOpen(session.staff.role, "reviews") || !UUID.test(id)) return { ok: false };
  const patch: Record<string, unknown> = {};
  if (status === "published" || status === "hidden") patch.status = status;
  if (reply !== null) {
    const clean = String(reply).trim().slice(0, 600);
    patch.reply = clean || null;
    patch.replied_at = clean ? new Date().toISOString() : null;
  }
  if (!Object.keys(patch).length) return { ok: false };
  const supabase = await getSessionClient();
  const { error, count } = await supabase.from("reviews").update(patch, { count: "exact" }).eq("id", id);
  revalidatePath("/admin/reviews");
  return { ok: !error && Boolean(count) };
}
