import "server-only";
import { getTranslations } from "next-intl/server";
import type { OrderDetail } from "./orders";

export type CustomerMessage = { kind: "confirm" | "confirmed" | "packed" | "onTheWay" | "thanks" | "cancelled" | "refused"; text: string; url: string };

// Ready-to-send WhatsApp text for the order's current status, in the language the customer shopped in.
// Staff open it in WhatsApp and press send themselves; nothing is sent automatically.
export async function customerMessage(o: OrderDetail): Promise<CustomerMessage | null> {
  const t = await getTranslations({ locale: o.language, namespace: "CustomerMessage" });
  const tRack = await getTranslations({ locale: o.language, namespace: "Rack" });
  const tAreas = await getTranslations({ locale: o.language, namespace: "Areas" });
  const total = tRack("price", { amount: o.total });
  const key = o.area.split(/\s+/)[0]?.toLowerCase() ?? "";
  const area = key && tAreas.has(key) ? tAreas(key) : o.area;
  const name = o.customer.split(/\s+/)[0] ?? o.customer;
  const v = { name, orderNo: o.orderNo, total, area };

  const lines: string[] = [];
  let kind: CustomerMessage["kind"];
  switch (o.status) {
    case "waiting_confirmation":
      kind = "confirm";
      lines.push(t("confirmIntro", v), ...o.items.map((i) => `• ${t("item", { name: i.name, qty: i.qty })}`), "", t("confirmTotal", v), t("confirmAsk", v));
      break;
    case "confirmed":
      kind = "confirmed";
      lines.push(t("confirmed", v));
      break;
    case "packed":
      kind = "packed";
      lines.push(t("packed", v));
      break;
    case "with_courier":
      kind = "onTheWay";
      lines.push(t("onTheWay", v));
      if (o.courier) lines.push(t("courier", { courier: o.courier }));
      if (o.trackingNo) lines.push(t("tracking", { tracking: o.trackingNo }));
      lines.push(t("haveCash", v));
      break;
    case "delivered_cash_collected":
      kind = "thanks";
      lines.push(t("thanks", v), t("thanksStitch"));
      break;
    case "cancelled":
      kind = "cancelled";
      lines.push(t("cancelled", v));
      break;
    case "refused_at_door":
      kind = "refused";
      lines.push(t("refused", v));
      break;
  }
  lines.push("", t("signoff"));
  const text = lines.join("\n");
  const digits = o.phone.replace(/\D/g, "");
  if (!/^[1-9]\d{7,14}$/.test(digits)) return null;
  return { kind, text, url: `https://wa.me/${digits}?text=${encodeURIComponent(text)}` };
}
