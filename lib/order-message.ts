import "server-only";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import type { Totals } from "@/lib/pricing";

export type MessageLine = { name: string; brand: string; code: string; qty: number; amount: number; stitch: boolean };

type Input = {
  locale: Locale;
  orderNo: string;
  lines: MessageLine[];
  totals: Totals;
  giftBox: boolean;
  gift: { recipientName: string; recipientArea: string; note: string } | null;
  area: string;
  customerName: string;
  customerPhone: string;
  vatPct: number;
  address?: string | null; // a saved address from My Thaanora, with a map link
};

// The text the customer sends us on WhatsApp, in the language she shopped in.
export async function buildOrderMessage(o: Input): Promise<string> {
  const t = await getTranslations({ locale: o.locale, namespace: "OrderMessage" });
  const tRack = await getTranslations({ locale: o.locale, namespace: "Rack" });
  const tAreas = await getTranslations({ locale: o.locale, namespace: "Areas" });
  const tCircle = await getTranslations({ locale: o.locale, namespace: "Circle" });
  const price = (n: number) => tRack("price", { amount: n });
  const areaKey = o.area.split(/\s+/)[0]?.toLowerCase() ?? "";
  const area = areaKey && tAreas.has(areaKey) ? tAreas(areaKey) : o.area;

  const out: string[] = [t("greeting", { orderNo: o.orderNo }), ""];
  for (const l of o.lines) {
    out.push(`• ${t("line", { name: l.name, brand: l.brand, code: l.code, qty: l.qty, amount: price(l.amount) })}`);
    if (l.stitch) out.push(`  ${t("stitching")}`);
  }
  out.push("");
  out.push(t("subtotal", { amount: price(o.totals.subtotal) }));
  // The one discount used (the best of Circle level, bundle, code, birthday gift, personal offer).
  const d = o.totals.discount;
  if (d) {
    const amount = price(d.amount);
    if (d.kind === "bundle") out.push(t("bundle", { pct: d.pct, amount }));
    else if (d.kind === "code") out.push(t("code", { code: d.ref ?? "", amount }));
    else if (d.kind === "loyalty") out.push(t("loyalty", { level: tCircle.has(`levels.${d.ref}`) ? tCircle(`levels.${d.ref}`) : (d.ref ?? ""), pct: d.pct, amount }));
    else if (d.kind === "birthday") out.push(t("birthday", { pct: d.pct, amount }));
    else out.push(t("personal", { pct: d.pct, amount }));
  }
  out.push(o.giftBox ? (o.totals.packagingFee > 0 ? t("giftBox", { amount: price(o.totals.packagingFee) }) : t("giftBoxFree")) : t("keeperBag"));
  out.push(t("delivery", { area, amount: o.totals.deliveryFee > 0 ? price(o.totals.deliveryFee) : t("free") }));
  if (o.address) out.push(t("address", { address: o.address }));
  out.push(o.vatPct > 0 ? t("total", { amount: price(o.totals.total), pct: o.vatPct }) : t("totalNoVat", { amount: price(o.totals.total) }));
  if (o.gift) {
    out.push("");
    out.push(t("giftHeader"));
    if (o.gift.recipientName) out.push(t("giftTo", { name: o.gift.recipientName }));
    if (o.gift.recipientArea) out.push(t("giftArea", { area: o.gift.recipientArea }));
    if (o.gift.note) out.push(t("giftNote", { note: o.gift.note }));
  }
  out.push("");
  out.push(t("customer", { name: o.customerName, phone: o.customerPhone }));
  out.push(t("closing"));
  return out.join("\n");
}
