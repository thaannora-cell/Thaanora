import "server-only";
import { getSessionClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import type { StaffRole } from "./sections";

export type StaffMember = {
  id: string;
  name: string;
  email: string | null;
  role: StaffRole;
  active: boolean;
  linked: boolean;
  lastSignIn: string | null;
};

// The staff list, read as the owner (RLS). Last sign-in comes from Supabase Auth (secret key, server only;
// the page itself is owner-only, checked before this runs).
export async function getStaffPage(): Promise<{ staff: StaffMember[]; failed: boolean }> {
  const supabase = await getSessionClient();
  const { data, error } = await supabase.from("staff").select("id, name, email, role, active, user_id, created_at").order("created_at");
  const signIns = new Map<string, string | null>();
  const admin = getAdminClient();
  if (admin) {
    const { data: users } = await admin.auth.admin.listUsers({ perPage: 200 });
    for (const u of users?.users ?? []) signIns.set(u.id, u.last_sign_in_at ?? null);
  }
  return {
    staff: (data ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      email: s.email,
      role: s.role as StaffRole,
      active: s.active,
      linked: Boolean(s.user_id),
      lastSignIn: s.user_id ? (signIns.get(s.user_id) ?? null) : null,
    })),
    failed: Boolean(error),
  };
}
