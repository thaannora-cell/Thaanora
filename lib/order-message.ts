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
  bundlePct: number | null;
  discountCode: string | null;
  giftBox: boolean;
  gift: { recipientName: string; recipientArea: string; note: string } | null;
  area: string;
  customerName: string;
  customerPhone: string;
  vatPct: number;
};

// The text the customer sends us on WhatsApp, in the language she shopped in.
export async function buildOrderMessage(o: Input): Promise<string> {
  const t = await getTranslations({ locale: o.locale, namespace: "OrderMessage" });
  const tRack = await getTranslations({ locale: o.locale, namespace: "Rack" });
  const tAreas = await getTranslations({ locale: o.locale, namespace: "Areas" });
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
  if (o.totals.bundleDiscount > 0 && o.bundlePct) out.push(t("bundle", { pct: o.bundlePct, amount: price(o.totals.bundleDiscount) }));
  if (o.totals.codeDiscount > 0 && o.discountCode) out.push(t("code", { code: o.discountCode, amount: price(o.totals.codeDiscount) }));
  out.push(o.giftBox ? t("giftBox", { amount: price(o.totals.packagingFee) }) : t("keeperBag"));
  out.push(t("delivery", { area, amount: o.totals.deliveryFee > 0 ? price(o.totals.deliveryFee) : t("free") }));
  out.push(t("total", { amount: price(o.totals.total), pct: o.vatPct }));
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
