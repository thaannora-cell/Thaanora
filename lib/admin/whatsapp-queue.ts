import "server-only";
import { getTranslations } from "next-intl/server";
import { getSessionClient } from "@/lib/supabase/server";
import { getOrder } from "./orders";
import { getRequest, requestReply } from "./requests";
import { customerMessage } from "./customer-message";
import { isNotificationType, type NotificationType } from "@/lib/notifications";

export type QueuedMessage = {
  id: string;
  type: NotificationType;
  createdAt: string;
  customer: string;
  phone: string;
  ref: string | null; // order number or request reference
  link: string | null; // back-office page for the order / request
  text: string | null;
  url: string | null; // wa.me link with the text, or null if the mobile can't take one
};

// Customers who chose "website + WhatsApp" get their notifications on this list. Staff open WhatsApp
// with the ready text (the Step 33 templates for orders and requests), send it, and tick it off.
export async function whatsappQueue(shopNumber: string | null): Promise<{ items: QueuedMessage[]; failed: boolean }> {
  const supabase = await getSessionClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("id, type, data, created_at, customers (name, phone, language)")
    .eq("whatsapp_status", "pending")
    .order("created_at")
    .limit(50);
  if (error) return { items: [], failed: true };

  const items: QueuedMessage[] = [];
  for (const n of data ?? []) {
    if (!isNotificationType(n.type)) continue;
    const c = (Array.isArray(n.customers) ? n.customers[0] : n.customers) as { name: string; phone: string; language: string } | null;
    if (!c) continue;
    const d = (n.data ?? {}) as Record<string, string>;
    const base = { id: n.id, type: n.type, createdAt: n.created_at, customer: c.name, phone: c.phone };

    if (n.type === "order_status" && d.orderNo) {
      const o = await getOrder(d.orderNo);
      const msg = o ? await customerMessage(o, shopNumber) : null;
      items.push({ ...base, ref: d.orderNo, link: `/admin/orders/${d.orderNo}`, text: msg?.text ?? null, url: msg?.url ?? null });
      continue;
    }
    if (n.type === "request_update" && d.requestId) {
      const r = await getRequest(d.requestId);
      const reply = r ? await requestReply(r) : null;
      items.push({ ...base, ref: r?.ref ?? null, link: `/admin/requests/${d.requestId}`, text: reply?.text ?? null, url: reply?.url ?? null });
      continue;
    }
    // Other kinds (offers, favourites, birthday…): the notification's own words in her language.
    const t = await getTranslations({ locale: ["en", "ar", "ur", "hi"].includes(c.language) ? c.language : "en", namespace: "Notifications" });
    const title = d.title ?? (t.has(`types.${n.type}.title`) ? t(`types.${n.type}.title`, { name: d.name ?? "", brand: d.brand ?? "", level: d.level ?? "", pct: d.pct ?? "", price: d.price ?? "" }) : "");
    const body = d.body ?? (t.has(`types.${n.type}.body`) ? t(`types.${n.type}.body`) : "");
    const text = [title, body].filter(Boolean).join("\n");
    const digits = c.phone.replace(/\D/g, "");
    items.push({ ...base, ref: null, link: null, text, url: /^[1-9]\d{7,14}$/.test(digits) ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}` : null });
  }
  return { items, failed: false };
}

export async function whatsappQueueCount(): Promise<number> {
  const supabase = await getSessionClient();
  const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("whatsapp_status", "pending");
  return count ?? 0;
}
