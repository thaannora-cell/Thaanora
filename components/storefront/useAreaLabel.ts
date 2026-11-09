"use client";

import { useTranslations } from "next-intl";

// Delivery areas are stored in English in settings; known Riyadh zones get a translated label.
export function useAreaLabel() {
  const t = useTranslations("Areas");
  return (area: string) => {
    const key = area.split(/\s+/)[0]?.toLowerCase() ?? "";
    return key && t.has(key) ? t(key) : area;
  };
}
