"use client";

import { useTranslations } from "next-intl";
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

// The rack panel's actions, for the pop-up a collection card opens: price and stock, Add to my
// selection (or Notify me when sold out), Try on me, Get it stitched, Share and the heart.
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
      <div className="flex flex-wrap gap-2">
        {stock === "out" ? (
          <button type="button" onClick={onNotify} className="th-btn th-btn-pink">
            {tPanel("notifyBtn")}
          </button>
        ) : (
          <button type="button" onClick={onToggleChosen} aria-pressed={chosen} className={`th-btn ${chosen ? "border-emerald bg-emerald text-ivory-white" : "th-btn-pink"}`}>
            {chosen ? (stitched ? tPanel("addedStitched") : tHome("added")) : tHome("add")}
          </button>
        )}
        <button type="button" onClick={onTry} className="th-btn gap-1.5">
          <span className="rounded-full bg-gold px-1.5 text-[11px] font-semibold text-emerald">AI</span>
          {tHome("try_btn")}
        </button>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
        <button type="button" onClick={onStitch} className="min-h-[32px] text-emerald underline underline-offset-[3px]">
          {tHome("q_stitch")}
        </button>
        <button type="button" onClick={onShare} className="min-h-[32px] text-emerald underline underline-offset-[3px]">
          {tPanel("shareLink")}
        </button>
      </div>
    </div>
  );
}
