"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/admin/session";
import { canOpen } from "@/lib/admin/sections";
import { getSessionClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import type { FormResult } from "../offers/actions";

const ROLES = ["owner", "orders", "catalogue"];
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const fail = (error: string): FormResult => ({ ok: false, error, at: Date.now() });
const done = (message: string, args: Record<string, string | number> = {}): FormResult => ({ ok: true, message: JSON.stringify([message, args]), at: Date.now() });

// Owner only. Returns the owner's own staff id so they can't block or demote themselves by accident.
async function owner() {
  const session = await getSession();
  if (session.state !== "staff" || !canOpen(session.staff.role, "staff")) return null;
  return { me: session.staff.id, supabase: await getSessionClient() };
}
const lastOwner = (msg: string) => /at least one active owner/i.test(msg);

// Adds the person to the staff list and creates their sign-in account (no email is sent).
// They then open /admin, enter this email and get a sign-in link. The two are linked by email automatically.
export async function inviteStaff(_p: FormResult, form: FormData): Promise<FormResult> {
  const o = await owner();
  if (!o) return fail("forbidden");
  const name = String(form.get("name") ?? "").trim().replace(/\s+/g, " ").slice(0, 80);
  const email = String(form.get("email") ?? "").trim().toLowerCase().slice(0, 200);
  const role = String(form.get("role") ?? "");
  if (name.length < 2) return fail("name");
  if (!EMAIL.test(email)) return fail("email");
  if (!ROLES.includes(role)) return fail("role");

  const { error } = await o.supabase.from("staff").insert({ name, email, role, active: true });
  if (error) return fail(error.code === "23505" ? "emailTaken" : "saveFailed");

  const admin = getAdminClient();
  if (admin) {
    const { error: authErr } = await admin.auth.admin.createUser({ email, email_confirm: true });
    // "Already registered" is fine: the staff row links to the existing account by email.
    if (authErr && !/already|registered|exists/i.test(authErr.message)) {
      console.error("[staff] sign-in account not created:", authErr.status, authErr.code);
      revalidatePath("/admin/staff");
      return fail("accountFailed");
    }
  }
  revalidatePath("/admin/staff");
  return done("invited", { name, email });
}

export async function setStaffRole(id: string, role: string): Promise<FormResult> {
  const o = await owner();
  if (!o) return fail("forbidden");
  if (!ROLES.includes(role)) return fail("role");
  if (id === o.me && role !== "owner") return fail("self");
  const { error, count } = await o.supabase.from("staff").update({ role }, { count: "exact" }).eq("id", id);
  if (error) return fail(lastOwner(error.message) ? "lastOwner" : "saveFailed");
  if (!count) return fail("saveFailed");
  revalidatePath("/admin/staff");
  return { ok: true, at: Date.now() };
}

// Blocking switches the staff row off (the database then refuses them everything) and bans the
// sign-in account in Supabase, so even an open session stops working. Unblocking reverses both.
export async function setStaffActive(id: string, active: boolean): Promise<FormResult> {
  const o = await owner();
  if (!o) return fail("forbidden");
  if (id === o.me && !active) return fail("self");
  const { data, error } = await o.supabase.from("staff").update({ active: Boolean(active) }).eq("id", id).select("user_id").maybeSingle();
  if (error) return fail(lastOwner(error.message) ? "lastOwner" : "saveFailed");
  if (!data) return fail("saveFailed");
  const admin = getAdminClient();
  if (admin && data.user_id) {
    const { error: banErr } = await admin.auth.admin.updateUserById(data.user_id, { ban_duration: active ? "none" : "876000h" });
    if (banErr) console.error("[staff] ban not updated:", banErr.status, banErr.code);
  }
  revalidatePath("/admin/staff");
  return { ok: true, at: Date.now() };
}
