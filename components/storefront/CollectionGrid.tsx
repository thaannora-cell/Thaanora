"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { salePrice, type PublicProduct } from "@/lib/product";
import ProductCard from "./ProductCard";

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
        {shown.map((p) => (
          <li key={p.code}>
            <ProductCard product={p} saved={saved.includes(p.code)} onOpen={onOpen} onToggleSaved={onToggleSaved} />
          </li>
        ))}
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
