"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import FilterCard from "./FilterCard";
import { DEFAULT_FILTERS, brandsOf, filterProducts, type Filters } from "@/lib/filters";
import type { PublicProduct } from "@/lib/products";

const SAVED_KEY = "th_saved";

function readSaved(): string[] {
  try {
    const raw = window.localStorage.getItem(SAVED_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

type Props = {
  products: PublicProduct[];
  brandOfMonth: string | null;
  loadFailed: boolean;
};

export default function ShopBrowser({ products, brandOfMonth, loadFailed }: Props) {
  const t = useTranslations("Home");
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [saved, setSaved] = useState<string[]>([]);

  useEffect(() => setSaved(readSaved()), []);

  const brands = useMemo(() => brandsOf(products), [products]);
  const shown = useMemo(() => filterProducts(products, filters, saved), [products, filters, saved]);

  return (
    <>
      <FilterCard
        filters={filters}
        onChange={(next) => setFilters((f) => ({ ...f, ...next }))}
        brands={brands}
        brandOfMonth={brandOfMonth}
        savedCount={saved.length}
      />

      <div className="mt-4 pb-1.5 flex flex-wrap justify-between gap-3 text-[13px] text-muted">
        <span aria-live="polite" className="tabular-nums">
          {loadFailed ? t("loadError") : t("count", { shown: shown.length, total: products.length })}
        </span>
        <span className="hidden md:inline">{t("tip")}</span>
      </div>

      {!loadFailed && shown.length === 0 && (
        <p className="mt-2 rounded-[20px] border-[1.5px] border-dashed border-line p-5 text-center text-muted">
          {filters.occasion === "saved" ? t("noSaved") : t("noMatch")}
        </p>
      )}

      {/* Fabric rack — next step */}
    </>
  );
}
