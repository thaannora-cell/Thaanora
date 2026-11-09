import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Secret-key client for server routes only. Bypasses RLS, so validate every input before using it.
export function getAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
