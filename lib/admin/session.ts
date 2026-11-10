import "server-only";
import { cache } from "react";
import { getSessionClient } from "@/lib/supabase/server";
import type { StaffRole } from "./sections";

export type Staff = { id: string; name: string; email: string | null; role: StaffRole };
export type Session =
  | { state: "signed-out" }
  | { state: "no-access"; email: string }
  | { state: "staff"; email: string; staff: Staff };

// Who is signed in, checked with Supabase on every request (getUser, not the cookie alone),
// and their active staff row, read through RLS ("staff read own row").
export const getSession = cache(async (): Promise<Session> => {
  const supabase = await getSessionClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { state: "signed-out" };
  const email = data.user.email ?? "";

  const { data: row } = await supabase
    .from("staff")
    .select("id, name, email, role, active")
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (!row || !row.active || !["owner", "orders", "catalogue"].includes(row.role)) {
    return { state: "no-access", email };
  }
  return { state: "staff", email, staff: { id: row.id, name: row.name, email: row.email, role: row.role as StaffRole } };
});
