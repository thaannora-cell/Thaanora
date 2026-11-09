"use client";

import { useTranslations } from "next-intl";

export default function TopBar() {
  const t = useTranslations("TopBar");

  return (
    <div className="bg-emerald text-gold-light text-[13.5px] font-medium">
      <div className="max-w-[1320px] mx-auto px-4 flex items-center justify-center md:justify-between gap-4 min-h-[38px] md:min-h-[42px] py-2">

        {/* Shipping origin */}
        <span className="hidden md:flex items-center gap-2 shrink-0">
          <svg
            className="shrink-0"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-gold-light)"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <g className="mi-fly">
              <path d="M3 13 L21 6 L15 20 L12 14 Z" />
              <path d="M12 14 L21 6" />
            </g>
          </svg>
          {t("shipping")}
        </span>

        {/* Centre promo */}
        <span className="text-center">
          {t("promo")}
        </span>

        {/* WhatsApp */}
        <span className="hidden md:flex items-center gap-2 shrink-0">
          <svg
            className="shrink-0"
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-rani)"
            strokeWidth="1.8"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path
              className="mi-ring"
              d="M5 3 H9 L11 8 L8.5 9.5 A11 11 0 0 0 14.5 15.5 L16 13 L21 15 V19 A2 2 0 0 1 19 21 A16 16 0 0 1 3 5 A2 2 0 0 1 5 3Z"
            />
          </svg>
          {t("whatsapp")}
        </span>

      </div>
    </div>
  );
}
