import "server-only";
import { getSessionClient } from "@/lib/supabase/server";
import { isNotificationType, type NotificationChannel, type NotificationRow, type NotificationType } from "@/lib/notifications";

// All read as the signed-in customer: Row Level Security returns only her own rows.

export async function unreadCount(): Promise<number> {
  const supabase = await getSessionClient();
  const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null);
  return count ?? 0;
}

export async function listNotifications(limit = 60): Promise<NotificationRow[]> {
  const supabase = await getSessionClient();
  const { data } = await supabase.from("notifications").select("id, type, data, read_at, created_at").order("created_at", { ascending: false }).limit(limit);
  return (data ?? [])
    .filter((n) => isNotificationType(n.type))
    .map((n) => ({
      id: n.id,
      type: n.type as NotificationType,
      data: Object.fromEntries(Object.entries((n.data ?? {}) as Record<string, unknown>).map(([k, v]) => [k, String(v)])),
      readAt: n.read_at,
      createdAt: n.created_at,
    }));
}

export async function notificationPrefs(): Promise<Partial<Record<NotificationType, NotificationChannel>>> {
  const supabase = await getSessionClient();
  const { data } = await supabase.from("notification_prefs").select("type, channel");
  const out: Partial<Record<NotificationType, NotificationChannel>> = {};
  for (const p of data ?? []) if (isNotificationType(p.type)) out[p.type] = p.channel === "site_whatsapp" ? "site_whatsapp" : "site";
  return out;
}
