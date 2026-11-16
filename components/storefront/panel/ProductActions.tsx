"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { salePrice, stockState, type PublicProduct } from "@/lib/product";

type Props = {
  product: PublicProduct;
  chosen: boolean;
  stitched: boolean;
  saved: boolean;
  onToggleChosen: () => void;
  onToggleSaved: () => void;
  onTry: () => void;
  onStitch: () => void;
  onNotify: () => void;
  onShare: () => void;
};

// The rack panel's actions, for the pop-up a collection card opens: price and stock, then one row of
// Add to my selection (or Notify me), Try on me, the suit's own page, and icon buttons for Get it
// stitched and Share (WhatsApp / Facebook / Instagram). On narrow phones the row wraps.
export default function ProductActions({ product: p, chosen, stitched, saved, onToggleChosen, onToggleSaved, onTry, onStitch, onNotify, onShare }: Props) {
  const t = useTranslations("Rack");
  const tHome = useTranslations("Home");
  const tPanel = useTranslations("Panel");
  const stock = stockState(p.stock);

  return (
    <div className="flex flex-col gap-3 rounded-[16px] border border-line bg-white p-3.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className={`text-[22px] font-medium tabular-nums ${p.sale_pct > 0 ? "text-rani" : "text-emerald"}`}>
          {p.sale_pct > 0 && <s className="me-2 text-[15px] font-normal text-muted">{t("price", { amount: Number(p.price_sar) })}</s>}
          {t("price", { amount: salePrice(p) })}
        </span>
        <span className={`text-[13px] ${stock === "in" ? "text-muted" : "text-rani"}`}>
          {stock === "out" ? t("stockOut") : stock === "low" ? t("stockLow", { n: p.stock }) : t("stockIn")}
        </span>
        <button
          type="button"
          onClick={onToggleSaved}
          aria-pressed={saved}
          aria-label={t("save", { name: p.name })}
          className="ms-auto flex h-10 w-10 items-center justify-center rounded-full border border-line bg-ivory-white"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill={saved ? "var(--color-rani)" : "none"} stroke={saved ? "var(--color-rani)" : "var(--color-emerald)"} strokeWidth="1.6">
            <path d="M12 20 C5 15 3 11 5 8 C7 5 10.5 6 12 8.5 C13.5 6 17 5 19 8 C21 11 19 15 12 20Z" />
          </svg>
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
        {stock === "out" ? (
          <button type="button" onClick={onNotify} className="th-btn th-btn-pink whitespace-nowrap">
            {tPanel("notifyBtn")}
          </button>
        ) : (
          <button type="button" onClick={onToggleChosen} aria-pressed={chosen} className={`th-btn whitespace-nowrap ${chosen ? "border-emerald bg-emerald text-ivory-white" : "th-btn-pink"}`}>
            {chosen ? (stitched ? tPanel("addedStitched") : tHome("added")) : tHome("add")}
          </button>
        )}
        <button type="button" onClick={onTry} className="th-btn gap-1.5 whitespace-nowrap">
          <span className="rounded-full bg-gold px-1.5 text-[11px] font-semibold text-emerald">AI</span>
          {tHome("try_btn")}
        </button>
        <Link href={`/suits/${encodeURIComponent(p.code)}`} className="th-btn gap-1.5 whitespace-nowrap no-underline" title={tPanel("fullPage")}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M14 4h6v6" />
            <path d="M20 4l-8.5 8.5" />
            <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
          </svg>
          {tPanel("fullPageBtn")}
        </Link>
        <span className="flex items-center gap-2 sm:ms-auto">
          <IconButton label={tHome("q_stitch")} onClick={onStitch}>
            <g className="mi-snipA">
              <circle cx="6" cy="18" r="2.6" />
              <path d="M8 16.3 L19 5" />
            </g>
            <g className="mi-snipB">
              <circle cx="18" cy="18" r="2.6" />
              <path d="M16 16.3 L5 5" />
            </g>
          </IconButton>
          <IconButton label={tPanel("shareLink")} onClick={onShare}>
            <circle cx="18" cy="5.5" r="2.5" />
            <circle cx="6" cy="12" r="2.5" />
            <circle cx="18" cy="18.5" r="2.5" />
            <path d="M8.2 10.8 L15.8 6.7 M8.2 13.2 L15.8 17.3" />
          </IconButton>
        </span>
      </div>
    </div>
  );
}

// A round icon-only button with a tooltip and an accessible name.
function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className="th-pill flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full border-[1.5px] border-emerald bg-white text-emerald transition-transform hover:-translate-y-0.5">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-emerald)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {children}
      </svg>
    </button>
  );
}
