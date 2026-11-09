"use client";

import { useTranslations, useLocale } from "next-intl";
import LangSwitcher from "./LangSwitcher";
import { openTrackOrder } from "./TrackOrderDialog";
import { openSourcing } from "./SourcingDialog";
import { openTailors } from "./panel/StitchDialog";
import { openTryOn } from "./panel/TryOnDialog";
import { useSelection } from "./selection/SelectionProvider";

export default function Header() {
  const t = useTranslations("Header");
  const locale = useLocale();
  const selection = useSelection();
  const bagCount = selection?.totals.count ?? 0;

  return (
    <header className="bg-ivory-white border-b border-line sticky top-0 z-50 shadow-[0_2px_12px_rgba(14,59,46,0.07)]">
      <div className="max-w-[1320px] mx-auto px-4 flex items-center gap-4 min-h-[68px] flex-wrap py-2">

        {/* ── Logo ───────────────────────────────────────────── */}
        <a
          href={`/${locale}`}
          className="flex items-center gap-3 no-underline group shrink-0"
          aria-label={t("homeLabel")}
        >
          <span className="th-medal" aria-hidden="true">T</span>
          <span className="flex flex-col leading-none">
            <span
              className="font-[family-name:var(--font-cinzel)] font-semibold tracking-[0.18em] text-[18px] text-emerald pt-2"
            >
              THAANORA
            </span>
            <span
              className="font-[family-name:var(--font-amiri)] text-[13px] text-gold-ink"
              lang="ar"
              dir="rtl"
            >
              قماشكِ… على مقاسكِ
            </span>
          </span>
        </a>

        {/* ── Service pills ──────────────────────────────────── */}
        <nav
          className="flex items-center gap-2 flex-wrap ms-auto me-2"
          aria-label="Services"
        >
          {/* Virtual try-on */}
          <button
            type="button"
            onClick={openTryOn}
            className="th-pill relative overflow-hidden hidden lg:flex items-center gap-2 border border-line bg-ivory-white text-emerald rounded-full px-3 py-2 text-[13px] min-h-[38px] hover:border-gold transition-colors"
          >
            <span className="relative flex items-center justify-center w-5 h-5 rounded-full bg-rani/10 shrink-0">
              <span className="font-semibold text-[10px] text-rani tracking-wide">AI</span>
              <svg
                className="absolute -top-1 -end-1"
                width="10"
                height="10"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  className="mi-twinkle"
                  d="M12 2 L14 10 L22 12 L14 14 L12 22 L10 14 L2 12 L10 10Z"
                  fill="var(--color-rani)"
                />
              </svg>
            </span>
            {t("tryOn")}
          </button>

          {/* Tailor network */}
          <button
            type="button"
            onClick={openTailors}
            className="th-pill relative overflow-hidden hidden md:flex items-center gap-2 border border-line bg-ivory-white text-emerald rounded-full px-3 py-2 text-[13px] min-h-[38px] hover:border-gold transition-colors"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-rani)"
              strokeWidth="1.8"
              strokeLinecap="round"
              aria-hidden="true"
              className="shrink-0"
            >
              <g className="mi-snipA">
                <circle cx="6" cy="18" r="2.6" />
                <path d="M8 16.5 L20 6" />
              </g>
              <g className="mi-snipB">
                <circle cx="6" cy="6" r="2.6" />
                <path d="M8 7.5 L20 18" />
              </g>
            </svg>
            {t("tailor")}
          </button>

          {/* Sourcing request */}
          <button
            type="button"
            onClick={openSourcing}
            className="th-pill relative overflow-hidden hidden xl:flex items-center gap-2 border border-line bg-ivory-white text-emerald rounded-full px-3 py-2 text-[13px] min-h-[38px] hover:border-gold transition-colors"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-indigo)"
              strokeWidth="1.9"
              strokeLinecap="round"
              aria-hidden="true"
              className="shrink-0"
            >
              <g className="mi-peek">
                <circle cx="10.5" cy="10.5" r="6" />
                <path d="M15 15 L20.5 20.5" />
                <path d="M8 8.5 A3 3 0 0 1 10.5 7" stroke="var(--color-gold)" />
              </g>
            </svg>
            {t("sourcing")}
          </button>

          {/* Track order */}
          <button
            type="button"
            onClick={openTrackOrder}
            className="th-pill relative overflow-hidden hidden lg:flex items-center gap-2 border border-line bg-ivory-white text-emerald rounded-full px-3 py-2 text-[13px] min-h-[38px] hover:border-gold transition-colors"
          >
            <svg
              width="20"
              height="18"
              viewBox="0 0 24 22"
              fill="none"
              stroke="var(--color-gold-ink)"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="shrink-0"
            >
              <g className="mi-drive">
                <path d="M2.5 4.5 H14.5 V14.5 H2.5 Z" fill="var(--color-gold-light)" />
                <path d="M14.5 7.5 H18.5 L21.5 10.5 V14.5 H14.5" />
                <circle cx="7" cy="15.5" r="1.8" fill="var(--color-ivory-white)" />
                <circle cx="17.5" cy="15.5" r="1.8" fill="var(--color-ivory-white)" />
              </g>
              <path className="mi-road" d="M1 20 H23" />
            </svg>
            {t("trackOrder")}
          </button>
        </nav>

        {/* ── Language switcher ──────────────────────────────── */}
        <LangSwitcher />

        {/* ── Bag button ─────────────────────────────────────── */}
        <button
          type="button"
          aria-label={t("bagLabel", { count: bagCount })}
          onClick={selection?.openDrawer}
          className="relative flex items-center justify-center w-10 h-10 rounded-full border border-line bg-ivory-white text-emerald hover:border-gold transition-colors shrink-0"
        >
          {bagCount > 0 && (
            <span
              aria-hidden="true"
              className="absolute -top-1 -end-1 flex h-[20px] min-w-[20px] items-center justify-center rounded-full bg-rani px-1 text-[11px] font-semibold text-white tabular-nums shadow-[0_0_0_2px_var(--color-ivory-white)]"
            >
              {bagCount}
            </span>
          )}
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-emerald)"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M5 8 H19 L18 21 H6 Z" />
            <path className="mi-bob" d="M9 10 V6 A3 3 0 0 1 15 6 V10" />
          </svg>
        </button>

        {/* ── Gold crown — back office ───────────────────────── */}
        <button
          type="button"
          aria-label={t("backOfficeLabel")}
          title={t("backOfficeLabel")}
          className="relative flex items-center justify-center w-10 h-10 rounded-full bg-gold text-emerald hover:bg-gold-light transition-colors shrink-0 shadow-[0_2px_8px_rgba(200,161,90,0.4)]"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-emerald)"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path className="mi-bob" d="M3 18 H21 L19 8 L15 12 L12 5 L9 12 L5 8 Z" />
          </svg>
        </button>

      </div>
    </header>
  );
}
