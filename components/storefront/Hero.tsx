import { getLocale, getTranslations } from "next-intl/server";

type Props = { designs: number | null; brands: number | null };

export default async function Hero({ designs, brands }: Props) {
  const t = await getTranslations("Home");
  const locale = await getLocale();

  const stats = [
    { value: designs ?? "—", label: t("hs1"), icon: <RackIcon /> },
    { value: brands ?? "—", label: t("hs2"), icon: <StarIcon /> },
    { value: t("codValue"), label: t("hs3"), icon: <CashIcon /> },
  ];

  return (
    <section
      aria-labelledby="hero-title"
      className="th-hero relative overflow-hidden mt-3 md:mt-[22px] rounded-[22px] md:rounded-[28px] text-ivory-white px-[22px] py-[26px] md:px-12 md:py-10 grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[1.4fr_0.6fr] gap-6 items-center shadow-[0_20px_40px_rgba(8,42,32,0.18)]"
    >
      <div className="min-w-0">
        <span className="th-caps inline-flex items-center gap-2 rounded-full border border-gold/60 bg-gold/[0.08] text-gold-light px-4 py-[7px] text-[11px] md:text-[13px] font-semibold uppercase tracking-[0.1em] md:tracking-[0.16em]">
          <svg className="shrink-0 overflow-visible" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
            <path className="mi-spin" d="M12 2 L14 10 L22 12 L14 14 L12 22 L10 14 L2 12 L10 10Z" fill="var(--color-gold-light)" />
          </svg>
          {t("badge")}
        </span>
        <h1 id="hero-title" className="th-hero-title mt-[18px] mb-[14px]">
          {t.rich("h1", {
            em: (chunks) =>
              locale === "en" ? (
                <em lang="ar" dir="rtl">{chunks}</em>
              ) : (
                <em>{chunks}</em>
              ),
          })}
        </h1>
        <p className="hidden md:block m-0 max-w-[38em] text-[15px] lg:text-[18px] leading-relaxed text-[#D5E0DA]">{t("sub")}</p>
      </div>

      <ul
        aria-label={t("hstatsLabel")}
        className="th-scroll-row list-none m-0 p-0 flex flex-row lg:flex-col gap-2.5 overflow-x-auto lg:overflow-visible lg:justify-self-end"
      >
        {stats.map((s) => (
          <li
            key={s.label}
            className="th-hstat flex items-center gap-3 shrink-0 rounded-2xl border border-gold/35 bg-ivory-white/[0.07] px-3 py-2.5 lg:px-4 lg:py-3 lg:min-w-[220px]"
          >
            <span className="flex items-center justify-center w-10 h-10 rounded-full bg-gold/[0.18] shrink-0">{s.icon}</span>
            <span className="leading-tight">
              <b className="block font-[family-name:var(--font-cormorant)] text-[20px] md:text-[26px] font-semibold text-gold-light leading-none">
                {s.value}
              </b>
              <small className="text-[13px] text-[#D5E0DA]">{s.label}</small>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

const iconProps = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "var(--color-gold-light)",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  className: "overflow-visible",
};

function RackIcon() {
  return (
    <svg {...iconProps}>
      <g className="mi-bob">
        <path d="M6 3 V21 M10 3 V21 M14 3 V21 M18 3 V21" />
        <path d="M3 3 H21" />
      </g>
    </svg>
  );
}

function StarIcon() {
  return (
    <svg {...iconProps}>
      <path className="mi-twinkle" d="M12 3 L14.6 8.6 L20.6 9.3 L16.1 13.4 L17.3 19.4 L12 16.4 L6.7 19.4 L7.9 13.4 L3.4 9.3 L9.4 8.6 Z" />
    </svg>
  );
}

function CashIcon() {
  return (
    <svg {...iconProps}>
      <g className="mi-bob">
        <rect x="2.5" y="6" width="19" height="12" rx="1.5" />
        <circle cx="12" cy="12" r="2.8" />
      </g>
    </svg>
  );
}
