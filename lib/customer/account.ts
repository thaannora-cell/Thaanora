import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { getSessionClient } from "@/lib/supabase/server";
import { unreadCount } from "./notifications";

export type Customer = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  language: "en" | "ar" | "ur" | "hi";
  birthday: string | null; // yyyy-mm-dd
};

export type Account =
  | { state: "guest" }
  | { state: "new"; userId: string; email: string } // signed in, profile not made yet
  | { state: "deactivated"; userId: string }
  | { state: "customer"; userId: string; customer: Customer };

// Who is visiting, read once per request. Without a Supabase cookie there is no network call at all.
export const getAccount = cache(async (): Promise<Account> => {
  const jar = await cookies();
  if (!jar.getAll().some((c) => c.name.startsWith("sb-"))) return { state: "guest" };
  const supabase = await getSessionClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return { state: "guest" };
  // Row Level Security: a customer can read only her own profile.
  const { data: c } = await supabase
    .from("customers")
    .select("id, name, phone, email, language, birthday, status")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!c) return { state: "new", userId: user.id, email: (user.email ?? "").toLowerCase() };
  if (c.status !== "active") return { state: "deactivated", userId: user.id };
  return { state: "customer", userId: user.id, customer: { id: c.id, name: c.name, phone: c.phone, email: c.email, language: c.language, birthday: c.birthday } };
});

// The signed-in customer's id, or null (guest, new or deactivated). For linking orders and requests.
export async function currentCustomerId(): Promise<string | null> {
  const a = await getAccount();
  return a.state === "customer" ? a.customer.id : null;
}

// For the header: the first letter of her name and her unread notifications, when signed in.
export async function accountBadge(): Promise<{ initial: string; unread: number | null } | null> {
  const a = await getAccount();
  if (a.state === "customer") {
    return { initial: a.customer.name.trim().charAt(0).toUpperCase() || "•", unread: await unreadCount() };
  }
  if (a.state === "new") return { initial: "•", unread: null };
  return null;
}
