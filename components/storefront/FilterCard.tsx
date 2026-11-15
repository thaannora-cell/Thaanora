"use client";

import { useLocale, useTranslations } from "next-intl";
import { COLOUR_FAMILIES, OCCASIONS, type Filters } from "@/lib/filters";

type Props = {
  filters: Filters;
  onChange: (next: Partial<Filters>) => void;
  brands: string[];
  brandOfMonth: string | null;
  savedCount: number;
  designs: number | null; // visible suits, for the title row ("18 designs · 5 brands · Cash on delivery")
};

// The top of the shop (no hero banner): the title row, the occasion chips, then colours + search + brand.
// Compact, so the fabric rack shows on the first screen.
export default function FilterCard({ filters, onChange, brands, brandOfMonth, savedCount, designs }: Props) {
  const t = useTranslations("Home");
  const locale = useLocale();
  // Arabic leads with the Arabic line; the other languages lead with their own and add the Arabic tagline.
  const mainFont = locale === "ar" ? "font-[family-name:var(--font-amiri)] font-bold" : locale === "ur" ? "font-[family-name:var(--font-urdu)]" : locale === "hi" ? "font-[family-name:var(--font-hindi)] font-medium" : "font-[family-name:var(--font-cormorant)] font-semibold";
  const subFont = locale === "ar" ? "font-[family-name:var(--font-cormorant)] font-semibold" : "font-[family-name:var(--font-amiri)] font-bold";

  return (
    <section
      aria-label={t("filtersLabel")}
      className="mt-2 flex flex-col gap-2.5 rounded-[18px] md:rounded-3xl border border-line bg-[#FFFDF8] px-3 py-2.5 md:px-5 md:py-3 shadow-[0_10px_30px_rgba(14,59,46,0.06)]"
    >
      {/* Row 1: title */}
      <div className="flex min-w-0 items-baseline justify-between gap-4">
        <h1 className="m-0 flex min-w-0 items-baseline gap-2.5 overflow-hidden whitespace-nowrap leading-tight">
          <span className={`${mainFont} shrink-0 text-[22px] text-emerald md:text-[30px]`}>{t("titleMain")}</span>
          <span lang={locale === "ar" ? "en" : "ar"} dir={locale === "ar" ? "ltr" : "rtl"} className={`${subFont} min-w-0 truncate text-[17px] text-gold-ink md:text-[22px]`}>
            {t("titleSub")}
          </span>
        </h1>
        <p className="m-0 hidden shrink-0 text-[13px] text-muted md:block">
          {t("titleStats", { designs: designs ?? 0, brands: brands.length })}
        </p>
      </div>

      {/* Row 2: occasions, always one row (scrolls sideways when it doesn't fit) */}
      <div
        role="group"
        aria-label={t("occasionLabel")}
        className="th-scroll-row -mx-1 flex flex-nowrap items-center gap-2 overflow-x-auto px-1 pb-0.5"
      >
        {OCCASIONS.map((o) => {
          const pressed = filters.occasion === o;
          const sale = o === "sale";
          return (
            <button
              key={o}
              type="button"
              aria-pressed={pressed}
              onClick={() => onChange({ occasion: o })}
              className={[
                "th-chip inline-flex shrink-0 items-center gap-[7px] rounded-full border px-4 py-1.5 min-h-[40px] text-[14px] md:text-[15px] whitespace-nowrap",
                sale
                  ? "border-rani/45 text-rani aria-pressed:bg-rani aria-pressed:border-rani aria-pressed:text-white"
                  : "border-line bg-ivory-white text-emerald aria-pressed:bg-emerald aria-pressed:border-emerald aria-pressed:text-ivory-white",
                sale && !pressed ? "bg-ivory-white" : "",
              ].join(" ")}
            >
              {pressed && (
                <svg className="shrink-0 overflow-visible" width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
                  <path className="mi-twinkle" d="M12 2 L14 10 L22 12 L14 14 L12 22 L10 14 L2 12 L10 10Z" fill="var(--color-gold-light)" />
                </svg>
              )}
              {t(`o_${o}`)}
              {o === "saved" && savedCount > 0 && <span className="tabular-nums">({savedCount})</span>}
            </button>
          );
        })}
      </div>

      {/* Row 3: colours, then search + brand (one row on desktop) */}
      <div className="flex flex-col gap-2.5 border-t border-[#EFE6D6] pt-2.5 md:flex-row md:items-center md:justify-between md:gap-4">
        <div
          role="group"
          aria-label={t("colour")}
          className="th-scroll-row -mx-1 flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto px-1 py-1"
        >
          <span className="th-caps shrink-0 me-1 text-[12px] font-semibold uppercase tracking-[0.12em] text-emerald">
            {t("colour")}
          </span>
          <DotButton
            label={t("famAll")}
            pressed={filters.family === "all"}
            onClick={() => onChange({ family: "all" })}
            style={{ background: "conic-gradient(#8E1F2F,#C9A13B,#4F6B3A,#3D5A80,#A894C4,#E8E0D0,#8E1F2F)" }}
          />
          {COLOUR_FAMILIES.map((f) => (
            <DotButton
              key={f.id}
              label={t(`fam_${f.id}`)}
              pressed={filters.family === f.id}
              onClick={() => onChange({ family: f.id })}
              style={{ background: f.swatch }}
            />
          ))}
        </div>

        <div className="flex min-w-0 shrink-0 items-center gap-2.5">
          <label className="relative flex flex-1 md:flex-none items-center min-w-0">
            <span className="sr-only">{t("searchLabel")}</span>
            <svg
              className="absolute start-3.5 pointer-events-none overflow-visible"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-indigo)"
              strokeWidth="1.9"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <g className="mi-peek">
                <circle cx="10.5" cy="10.5" r="6" />
                <path d="M15 15 L20.5 20.5" />
              </g>
            </svg>
            <input
              type="search"
              value={filters.query}
              onChange={(e) => onChange({ query: e.target.value })}
              placeholder={t("searchPlaceholder")}
              className="w-full md:w-[260px] lg:w-[300px] min-h-[42px] rounded-full border border-line bg-white ps-10 pe-4 text-[15px] text-ink placeholder:text-muted focus:outline-none focus:border-gold"
            />
          </label>
          <label className="shrink-0 w-[44%] md:w-auto">
            <span className="sr-only">{t("brandLabel")}</span>
            <select
              value={filters.brand}
              onChange={(e) => onChange({ brand: e.target.value })}
              className="w-full md:min-w-[160px] min-h-[42px] rounded-full border border-line bg-white px-4 text-[15px] text-emerald focus:outline-none focus:border-gold"
            >
              <option value="all">{t("allBrands")}</option>
              {brands.map((b) => (
                <option key={b} value={b}>
                  {b === brandOfMonth ? `${b} · ${t("brandOfMonth")}` : b}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </section>
  );
}

function DotButton({
  label,
  pressed,
  onClick,
  style,
}: {
  label: string;
  pressed: boolean;
  onClick: () => void;
  style: React.CSSProperties;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={label}
      title={label}
      onClick={onClick}
      style={style}
      className="th-dot shrink-0 w-8 h-8 rounded-full"
    />
  );
}
