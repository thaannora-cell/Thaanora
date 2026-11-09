"use client";

import { useTranslations } from "next-intl";
import type { BundleRule } from "@/lib/pricing";

// "Pick 3 suits…", "1 picked · 2 more for 10% off", "3 picked · 10% off unlocked"
export function useBundleMessage(count: number, bundle: BundleRule | null): string {
  const t = useTranslations("Selection");
  if (!bundle) return count === 0 ? t("pickNoBundle") : t("picked", { n: count });
  if (count === 0) return t("pickToUnlock", { qty: bundle.qty, pct: bundle.pct });
  if (count < bundle.qty) return t("moreToUnlock", { n: count, left: bundle.qty - count, pct: bundle.pct });
  return t("unlocked", { n: count, pct: bundle.pct });
}
