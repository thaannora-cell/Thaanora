"use client";

import { useTranslations } from "next-intl";
import { COLOUR_FAMILIES, OCCASIONS, type Filters } from "@/lib/filters";

type Props = {
  filters: Filters;
  onChange: (next: Partial<Filters>) => void;
  brands: string[];
  brandOfMonth: string | null;
  savedCount: number;
};

export default function FilterCard({ filters, onChange, brands, brandOfMonth, savedCount }: Props) {
  const t = useTranslations("Home");

  return (
    <section
      aria-label={t("filtersLabel")}
      className="mt-[22px] flex flex-col gap-3 rounded-[18px] md:rounded-3xl border border-line bg-[#FFFDF8] p-3.5 md:px-[22px] md:py-[18px] shadow-[0_10px_30px_rgba(14,59,46,0.06)]"
    >
      {/* Occasions */}
      <div
        role="group"
        aria-label={t("occasionLabel")}
        className="th-scroll-row flex items-center gap-2 overflow-x-auto md:overflow-visible md:flex-wrap pb-0.5 md:pb-0 -mx-1 px-1"
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
                "th-chip inline-flex shrink-0 items-center gap-[7px] rounded-full border px-[18px] py-[9px] min-h-[44px] text-[15px] whitespace-nowrap",
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

      <div className="flex flex-col md:flex-row md:flex-wrap md:items-center md:justify-between gap-3 border-t border-[#EFE6D6] pt-3">
        {/* Colour */}
        <div
          role="group"
          aria-label={t("colour")}
          className="th-scroll-row flex items-center gap-2 overflow-x-auto md:overflow-visible -mx-1 px-1 py-1 min-w-0"
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

        {/* Search + brand */}
        <div className="flex items-center gap-2.5 min-w-0">
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
              className="w-full md:w-[300px] min-h-[46px] rounded-full border border-line bg-white ps-10 pe-4 text-[15px] text-ink placeholder:text-muted focus:outline-none focus:border-gold"
            />
          </label>
          <label className="shrink-0 w-[44%] md:w-auto">
            <span className="sr-only">{t("brandLabel")}</span>
            <select
              value={filters.brand}
              onChange={(e) => onChange({ brand: e.target.value })}
              className="w-full md:min-w-[170px] min-h-[46px] rounded-full border border-line bg-white px-4 text-[15px] text-emerald focus:outline-none focus:border-gold"
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
      className="th-dot shrink-0 w-9 h-9 rounded-full"
    />
  );
}
