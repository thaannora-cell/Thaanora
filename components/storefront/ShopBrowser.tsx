"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import FilterCard from "./FilterCard";
import FabricRack from "./rack/FabricRack";
import { DEFAULT_FILTERS, brandsOf, filterProducts, type Filters } from "@/lib/filters";
import type { PublicProduct } from "@/lib/product";

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

function writeSaved(codes: string[]) {
  try {
    window.localStorage.setItem(SAVED_KEY, JSON.stringify(codes));
  } catch {
    // Private mode or storage blocked: saving still works for this visit.
  }
}

const toggle = (list: string[], code: string) => (list.includes(code) ? list.filter((c) => c !== code) : [...list, code]);

type Props = {
  products: PublicProduct[];
  brandOfMonth: string | null;
  loadFailed: boolean;
};

export default function ShopBrowser({ products, brandOfMonth, loadFailed }: Props) {
  const t = useTranslations("Home");
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [saved, setSaved] = useState<string[]>([]);
  const [chosen, setChosen] = useState<string[]>([]);
  const [activeCode, setActiveCode] = useState<string | null>(null);

  useEffect(() => setSaved(readSaved()), []);

  const brands = useMemo(() => brandsOf(products), [products]);
  const shown = useMemo(() => filterProducts(products, filters, saved), [products, filters, saved]);

  const toggleSaved = (code: string) =>
    setSaved((list) => {
      const next = toggle(list, code);
      writeSaved(next);
      return next;
    });

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

      {!loadFailed && (
        <FabricRack
          products={shown}
          activeCode={activeCode}
          onActivate={setActiveCode}
          chosen={chosen}
          saved={saved}
          brandOfMonth={brandOfMonth}
          onToggleSaved={toggleSaved}
          onToggleChosen={(code) => setChosen((list) => toggle(list, code))}
          emptyMessage={filters.occasion === "saved" ? t("noSaved") : t("noMatch")}
        />
      )}
    </>
  );
}
