"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import FilterCard from "./FilterCard";
import FabricRack from "./rack/FabricRack";
import type { PanelAction } from "./rack/Bolt";
import DetailsDialog from "./panel/DetailsDialog";
import StitchDialog, { type Tailor } from "./panel/StitchDialog";
import NotifyDialog from "./panel/NotifyDialog";
import TryOnDialog from "./panel/TryOnDialog";
import { DEFAULT_FILTERS, brandsOf, filterProducts, type Filters } from "@/lib/filters";
import { salePrice, stockState, type PublicProduct } from "@/lib/product";
import { useSelection } from "./selection/SelectionProvider";
import { openSourcing } from "./SourcingDialog";

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

type Dialog = { kind: Exclude<PanelAction, "share">; code: string } | null;

type Props = {
  products: PublicProduct[];
  brandOfMonth: string | null;
  loadFailed: boolean;
  tailors: Tailor[];
  areas: string[];
};

export default function ShopBrowser({ products, brandOfMonth, loadFailed, tailors, areas }: Props) {
  const t = useTranslations("Home");
  const tPanel = useTranslations("Panel");
  const tRack = useTranslations("Rack");
  const tSel = useTranslations("Selection");
  const selection = useSelection();
  const locale = useLocale();
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [saved, setSaved] = useState<string[]>([]);
  const [activeCode, setActiveCode] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  const rackAnchor = useRef<HTMLDivElement>(null);

  const showToast = useCallback((message: string) => {
    window.clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = window.setTimeout(() => setToast(null), 2800);
  }, []);

  useEffect(() => setSaved(readSaved()), []);

  // A shared link (?p=CODE) opens that fabric.
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("p");
    if (code && products.some((p) => p.code === code)) {
      setActiveCode(code);
      rackAnchor.current?.scrollIntoView({ block: "start" });
    }
  }, [products]);

  const chosen = useMemo(() => selection?.lines.map((l) => l.code) ?? [], [selection?.lines]);
  const stitching = useMemo(() => selection?.lines.filter((l) => l.stitch).map((l) => l.code) ?? [], [selection?.lines]);

  const toggleChosen = (code: string) => {
    if (!selection) return;
    if (selection.toggle(code) === "removed") {
      showToast(tSel("removedToast"));
      return;
    }
    const count = selection.totals.count + 1;
    const b = selection.bundle;
    showToast(
      !b ? tSel("addedToast") : count >= b.qty ? tSel("addedUnlockedToast", { pct: b.pct }) : tSel("addedLeftToast", { left: b.qty - count, pct: b.pct }),
    );
  };

  const brands = useMemo(() => brandsOf(products), [products]);
  const shown = useMemo(() => filterProducts(products, filters, saved), [products, filters, saved]);
  const dialogProduct = dialog ? products.find((p) => p.code === dialog.code) ?? null : null;

  const toggleSaved = (code: string) =>
    setSaved((list) => {
      const next = toggle(list, code);
      writeSaved(next);
      return next;
    });

  const share = async (p: PublicProduct) => {
    const url = `${window.location.origin}/${locale}?p=${encodeURIComponent(p.code)}`;
    const text = tPanel("shareText", { name: `${p.brand} ${p.name}`, price: tRack("price", { amount: salePrice(p) }) });
    if (navigator.share) {
      try {
        await navigator.share({ title: "Thaanora", text, url });
        return;
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      showToast(tPanel("linkCopied"));
    } catch {
      showToast(url);
    }
  };

  const onAction = (action: PanelAction, p: PublicProduct) => {
    if (action === "share") void share(p);
    else setDialog({ kind: action, code: p.code });
  };

  const closeDialog = () => setDialog(null);
  const isChosen = dialogProduct ? chosen.includes(dialogProduct.code) : false;
  const isOut = dialogProduct ? stockState(dialogProduct.stock) === "out" : false;

  return (
    <>
      <FilterCard
        filters={filters}
        onChange={(next) => setFilters((f) => ({ ...f, ...next }))}
        brands={brands}
        brandOfMonth={brandOfMonth}
        savedCount={saved.length}
      />

      <div ref={rackAnchor} className="mt-4 pb-1.5 flex flex-wrap justify-between gap-3 text-[13px] text-muted scroll-mt-40">
        <span aria-live="polite" className="tabular-nums">
          {loadFailed ? t("loadError") : t("count", { shown: shown.length, total: products.length })}
          <button type="button" onClick={openSourcing} className="ms-3 text-emerald underline underline-offset-2">
            {t("q_source")}
          </button>
        </span>
        <span className="hidden md:inline">{t("tip")}</span>
      </div>

      {!loadFailed && (
        <FabricRack
          products={shown}
          activeCode={activeCode}
          onActivate={setActiveCode}
          chosen={chosen}
          stitching={stitching}
          saved={saved}
          brandOfMonth={brandOfMonth}
          onToggleSaved={toggleSaved}
          onToggleChosen={toggleChosen}
          onAction={onAction}
          emptyMessage={filters.occasion === "saved" ? t("noSaved") : t("noMatch")}
          emptyAction={
            filters.occasion === "saved" ? undefined : (
              <button type="button" className="th-btn mt-3" onClick={openSourcing}>
                {t("requestAnyDesign")}
              </button>
            )
          }
        />
      )}

      {dialogProduct && (
        <>
          <DetailsDialog product={dialogProduct} open={dialog?.kind === "details"} onClose={closeDialog} />
          <StitchDialog
            product={dialogProduct}
            open={dialog?.kind === "stitch"}
            onClose={closeDialog}
            areas={areas}
            tailors={tailors}
            canAdd={!isOut}
            onAddWithStitching={() => {
              selection?.add(dialogProduct.code, { stitch: true });
              showToast(tPanel("addedWithStitching"));
            }}
            onToast={showToast}
          />
          <NotifyDialog product={dialogProduct} open={dialog?.kind === "notify"} onClose={closeDialog} />
          <TryOnDialog
            product={dialogProduct}
            open={dialog?.kind === "try"}
            onClose={closeDialog}
            primaryLabel={isOut ? tPanel("notifyBtn") : isChosen ? t("added") : t("add")}
            onPrimary={() => {
              if (isOut) setDialog({ kind: "notify", code: dialogProduct.code });
              else if (!isChosen) toggleChosen(dialogProduct.code);
            }}
          />
        </>
      )}

      {toast && (
        <div className="th-toast" role="status">
          {toast}
        </div>
      )}
    </>
  );
}
