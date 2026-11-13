"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { photoUrl, salePrice, stockState, type PublicProduct } from "@/lib/product";

const PAGE = 24;
type Sort = "featured" | "new" | "priceAsc" | "priceDesc";

type Props = {
  products: PublicProduct[]; // the suits that aren't on the rack (after the filters)
  saved: string[];
  onOpen: (code: string) => void; // opens the suit's panel on the rack
  onToggleSaved: (code: string) => void;
};

// "The collection": every suit not hanging on the rack, as cards, so the shop works with hundreds of suits.
export default function CollectionGrid({ products, saved, onOpen, onToggleSaved }: Props) {
  const t = useTranslations("Collection");
  const tRack = useTranslations("Rack");
  const [sort, setSort] = useState<Sort>("featured");
  const [count, setCount] = useState(PAGE);

  const sorted = useMemo(() => {
    const list = [...products];
    if (sort === "new") list.sort((a, b) => Number(b.is_new) - Number(a.is_new));
    if (sort === "priceAsc") list.sort((a, b) => salePrice(a) - salePrice(b));
    if (sort === "priceDesc") list.sort((a, b) => salePrice(b) - salePrice(a));
    return list; // "featured" keeps the shop's own product order
  }, [products, sort]);

  if (products.length === 0) return null;
  const shown = sorted.slice(0, count);

  return (
    <section aria-labelledby="collection-title" className="mt-10">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="th-caps m-0 font-[family-name:var(--font-cinzel)] text-[12px] tracking-[0.16em] text-gold-ink">{t("eyebrow")}</p>
          <h2 id="collection-title" className="m-0 font-[family-name:var(--font-cormorant)] text-[30px] font-semibold leading-tight text-emerald md:text-[34px]">
            {t("title")}
          </h2>
          <p className="m-0 text-[13px] text-muted">{t("count", { count: products.length })}</p>
        </div>
        <label className="flex items-center gap-2 text-[13px] text-muted">
          {t("sort")}
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="th-field min-h-[40px] w-auto py-1.5 text-[14px]">
            <option value="featured">{t("sortFeatured")}</option>
            <option value="new">{t("sortNew")}</option>
            <option value="priceAsc">{t("sortPriceAsc")}</option>
            <option value="priceDesc">{t("sortPriceDesc")}</option>
          </select>
        </label>
      </div>

      <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-5">
        {shown.map((p) => {
          const photo = [...p.product_images].sort((a, b) => a.sort_order - b.sort_order)[0];
          const price = salePrice(p);
          const stock = stockState(p.stock);
          const isSaved = saved.includes(p.code);
          return (
            <li key={p.code} className="th-lift relative flex flex-col overflow-hidden rounded-[18px] border border-line bg-ivory-white shadow-[0_6px_18px_rgba(14,59,46,0.06)]">
              <button type="button" onClick={() => onOpen(p.code)} className="flex flex-1 flex-col text-start" aria-label={t("open", { name: `${p.brand} ${p.name}` })}>
                <span className="relative block aspect-[3/4] w-full overflow-hidden" style={{ background: p.colour_hex }}>
                  {photo && (
                    <Image
                      src={photoUrl(photo.storage_path)}
                      alt={photo.alt ?? `${p.brand} — ${p.name}`}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                      className="object-cover object-[center_20%]"
                    />
                  )}
                  <span className="absolute start-2 top-2 flex flex-col items-start gap-1">
                    {p.sale_pct > 0 && <span className="rounded-full bg-rani px-2 py-0.5 text-[11px] font-semibold text-white">−{p.sale_pct}%</span>}
                    {p.is_new && <span className="rounded-full bg-gold px-2 py-0.5 text-[11px] font-semibold text-emerald">{t("new")}</span>}
                  </span>
                  {stock === "out" && (
                    <span className="absolute inset-x-0 bottom-0 bg-emerald/85 py-1 text-center text-[12px] text-gold-light">{t("soldOut")}</span>
                  )}
                </span>
                <span className="flex flex-1 flex-col gap-0.5 p-3">
                  <small className="text-[11px] text-gold-ink">{p.brand}</small>
                  <span className="line-clamp-2 text-[14px] font-medium leading-snug text-emerald">{p.name}</span>
                  <span className="mt-auto pt-1 text-[14px]">
                    {p.sale_pct > 0 && <s className="me-1.5 text-[12px] text-muted">{tRack("price", { amount: p.price_sar })}</s>}
                    <span className={p.sale_pct > 0 ? "font-semibold text-rani" : "font-medium text-ink"}>{tRack("price", { amount: price })}</span>
                  </span>
                  {stock === "low" && <small className="text-[11px] text-rani">{t("fewLeft", { count: p.stock })}</small>}
                </span>
              </button>
              <button
                type="button"
                onClick={() => onToggleSaved(p.code)}
                aria-pressed={isSaved}
                aria-label={isSaved ? t("unsave", { name: p.name }) : t("save", { name: p.name })}
                className="absolute end-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-ivory-white/90 shadow"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill={isSaved ? "var(--color-rani)" : "none"} stroke="var(--color-rani)" strokeWidth="1.8">
                  <path d="M12 20 C5 15 3 11.5 3 8.5 A4.5 4.5 0 0 1 12 6.5 A4.5 4.5 0 0 1 21 8.5 C21 11.5 19 15 12 20Z" />
                </svg>
              </button>
            </li>
          );
        })}
      </ul>

      {count < sorted.length && (
        <div className="mt-5 flex justify-center">
          <button type="button" onClick={() => setCount((c) => c + PAGE)} className="th-btn">
            {t("showMore", { count: Math.min(PAGE, sorted.length - count) })}
          </button>
        </div>
      )}
    </section>
  );
}
