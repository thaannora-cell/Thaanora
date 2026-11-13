// Notification types (same list as the database check). Plain constants, used on the website and in
// the back office.
export const NOTIFICATION_TYPES = [
  "order_status",
  "request_update",
  "back_in_stock",
  "price_drop",
  "new_arrival",
  "new_offer",
  "level_up",
  "birthday_gift",
  "announcement",
  "return_update",
  "review_reply",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
export type NotificationChannel = "site" | "site_whatsapp";

export const isNotificationType = (v: unknown): v is NotificationType =>
  typeof v === "string" && (NOTIFICATION_TYPES as readonly string[]).includes(v);

export type NotificationRow = {
  id: string;
  type: NotificationType;
  data: Record<string, string>;
  readAt: string | null;
  createdAt: string;
};

// Where tapping a notification takes her. Order updates open that order in My Thaanora.
export function notificationHref(n: Pick<NotificationRow, "type" | "data">, locale: string): string {
  if ((n.type === "order_status" || n.type === "return_update") && /^TH-\d{3,7}$/.test(n.data.orderNo ?? "")) return `/${locale}/account/orders/${n.data.orderNo}`;
  if (n.type === "review_reply") return `/${locale}/account/reviews`;
  // A favourite back in stock or cheaper: open that suit on the rack.
  if ((n.type === "back_in_stock" || n.type === "price_drop") && /^[\w.-]{1,64}$/.test(n.data.code ?? "")) return `/${locale}?p=${encodeURIComponent(n.data.code)}`;
  return `/${locale}/account`;
}
