import "server-only";
import { getTranslations } from "next-intl/server";
import type { OrderDetail } from "./orders";
import { templateFor } from "./wa-templates";
import { siteOrigin } from "@/lib/site-origin";
import { displayNumber, fillTemplate, type TemplateKind } from "@/lib/wa-templates";

export type CustomerMessage = { kind: "received" | "confirmed" | "packed" | "onTheWay" | "delivered" | "cancelled" | "refused"; text: string; url: string };

const FROM_TEMPLATE: Partial<Record<OrderDetail["status"], TemplateKind>> = {
  waiting_confirmation: "received",
  confirmed: "confirmed",
  with_courier: "onTheWay",
  delivered_cash_collected: "delivered",
};

// Ready-to-send WhatsApp text for the order's current status, in the language the customer shopped in.
// Received / confirmed / out for delivery / delivered come from the owner's templates (Settings);
// the rest are built-in. Staff open it in WhatsApp and press send themselves; nothing is sent automatically.
export async function customerMessage(o: OrderDetail, shopNumber: string | null): Promise<CustomerMessage | null> {
  const digits = o.phone.replace(/\D/g, "");
  if (!/^[1-9]\d{7,14}$/.test(digits)) return null;

  const t = await getTranslations({ locale: o.language, namespace: "CustomerMessage" });
  const tRack = await getTranslations({ locale: o.language, namespace: "Rack" });
  const tAreas = await getTranslations({ locale: o.language, namespace: "Areas" });
  const total = tRack("price", { amount: o.total });
  const key = o.area.split(/\s+/)[0]?.toLowerCase() ?? "";
  const area = key && tAreas.has(key) ? tAreas(key) : o.area;
  const name = o.customer.split(/\s+/)[0] ?? o.customer;
  const v = { name, orderNo: o.orderNo, total, area };

  let kind: CustomerMessage["kind"];
  let text: string;
  const tpl = FROM_TEMPLATE[o.status];
  if (tpl) {
    kind = tpl as CustomerMessage["kind"];
    text = fillTemplate(await templateFor(tpl, o.language), {
      ...v,
      items: o.items.map((i) => `• ${t("item", { name: i.name, qty: i.qty })}`).join("\n"),
      courier: o.courier ?? "",
      trackingNo: o.trackingNo ?? "",
      // Opens "Track my order" on the website with the order number filled in.
      trackingLink: `${await siteOrigin()}/${o.language}?track=${encodeURIComponent(o.orderNo)}`,
      shopNumber: shopNumber ? displayNumber(shopNumber) : "",
    });
  } else {
    kind = o.status === "packed" ? "packed" : o.status === "cancelled" ? "cancelled" : "refused";
    text = [t(kind, v), "", t("signoff")].join("\n");
  }
  return { kind, text, url: `https://wa.me/${digits}?text=${encodeURIComponent(text)}` };
}
