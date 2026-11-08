import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Anon-key client for reading public data on the server. RLS limits it to visible rows and safe columns.
export function getPublicClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
