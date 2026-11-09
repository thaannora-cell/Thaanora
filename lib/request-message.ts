import "server-only";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";

type Sourcing = {
  kind: "sourcing";
  reference: string;
  brand: string;
  link: string;
  quantity: number;
  notes: string;
  hasScreenshot: boolean;
};
type Notify = { kind: "notify_me" | "preorder"; reference: string; productName: string; productCode: string };

// The WhatsApp text the customer can send us after a request is saved, in her language.
export async function buildRequestMessage(
  locale: Locale,
  r: (Sourcing | Notify) & { name: string; phone: string },
): Promise<string> {
  const t = await getTranslations({ locale, namespace: "RequestMessage" });
  const lines: string[] = [];
  if (r.kind === "sourcing") {
    lines.push(t("sourcingGreeting", { reference: r.reference }));
    lines.push(t("brand", { brand: r.brand || t("notSure") }));
    lines.push(t("link", { link: r.link || (r.hasScreenshot ? t("seeScreenshot") : "—") }));
    lines.push(t("quantity", { n: r.quantity }));
    if (r.notes) lines.push(t("notes", { notes: r.notes }));
    if (r.hasScreenshot) lines.push(t("screenshotSaved"));
  } else {
    lines.push(
      t(r.kind === "preorder" ? "preorder" : "notify", { reference: r.reference, name: r.productName, code: r.productCode }),
    );
  }
  lines.push("");
  lines.push(r.name ? t("customerNamed", { name: r.name, phone: r.phone }) : t("customer", { phone: r.phone }));
  return lines.join("\n");
}
