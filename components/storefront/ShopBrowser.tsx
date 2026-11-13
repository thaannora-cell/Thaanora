"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import FilterCard from "./FilterCard";
import FabricRack from "./rack/FabricRack";
import type { PanelAction } from "./rack/Bolt";
import DetailsDialog from "./panel/DetailsDialog";
import StitchDialog, { OPEN_TAILORS_EVENT, type Tailor } from "./panel/StitchDialog";
import NotifyDialog from "./panel/NotifyDialog";
import TryOnDialog, { OPEN_TRYON_EVENT } from "./panel/TryOnDialog";
import type { Face } from "./tryon/ModelFigure";
import { DEFAULT_FILTERS, brandsOf, filterProducts, type Filters } from "@/lib/filters";
import { salePrice, type PublicProduct } from "@/lib/product";
import { useSelection } from "./selection/SelectionProvider";
import { openSourcing } from "./SourcingDialog";
import CollectionGrid from "./CollectionGrid";
import ProductActions from "./panel/ProductActions";
import { setFavourite, syncFavourites } from "@/app/[locale]/account/actions";

const SAVED_KEY = "th_saved";
// Set once this device's guest hearts have joined the signed-in account; from then on the account's list
// is the truth (so a heart removed on another device doesn't come back). Cleared when browsing as a guest.
const MERGED_KEY = "th_saved_merged";

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

// The rack holds 17 suits; the rest are in the collection grid below.
const RACK_SIZE = 17;

const toggle = (list: string[], code: string) => (list.includes(code) ? list.filter((c) => c !== code) : [...list, code]);

// fromGrid: opened from a collection card, so the details pop-up also carries the shop actions.
type Dialog = { kind: Exclude<PanelAction, "share">; code: string; fromGrid?: boolean } | null;

type Props = {
  products: PublicProduct[];
  brandOfMonth: string | null;
  loadFailed: boolean;
  tailors: Tailor[];
  signedIn?: boolean; // My Thaanora: hearts are kept on her account too
};

export default function ShopBrowser({ products, brandOfMonth, loadFailed, tailors, signedIn = false }: Props) {
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
  const [tailorsOpen, setTailorsOpen] = useState(false);
  // Her try-on photo lives only in this page's memory; it is never uploaded or saved.
  const [face, setFace] = useState<Face | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  const rackAnchor = useRef<HTMLDivElement>(null);

  const showToast = useCallback((message: string) => {
    window.clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = window.setTimeout(() => setToast(null), 2800);
  }, []);

  // Hearts from this device; when signed in, they join her account and every device shows the same ones.
  useEffect(() => {
    const local = readSaved();
    setSaved(local);
    let merged = false;
    try {
      merged = window.localStorage.getItem(MERGED_KEY) === "1";
      if (!signedIn) window.localStorage.removeItem(MERGED_KEY);
    } catch {
      /* storage blocked */
    }
    if (!signedIn) return;
    void syncFavourites(merged ? [] : local).then((codes) => {
      if (!codes) return;
      setSaved(codes);
      writeSaved(codes);
      try {
        window.localStorage.setItem(MERGED_KEY, "1");
      } catch {
        /* storage blocked */
      }
    });
  }, [signedIn]);

  // The header pill and the footer link open the tailor network screen.
  useEffect(() => {
    const onOpen = () => setTailorsOpen(true);
    window.addEventListener(OPEN_TAILORS_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_TAILORS_EVENT, onOpen);
  }, []);

  // The header's "Virtual try-on" pill opens the preview on the fabric that is open on the rack.
  const activeRef = useRef<string | null>(null);
  activeRef.current = activeCode;
  useEffect(() => {
    const onOpen = () => {
      const code = activeRef.current ?? products[0]?.code;
      if (code) setDialog({ kind: "try", code });
    };
    window.addEventListener(OPEN_TRYON_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_TRYON_EVENT, onOpen);
  }, [products]);

  // A shared link (?p=CODE) opens that fabric: on the rack if it hangs there, else in the pop-up.
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("p");
    if (!code || !products.some((p) => p.code === code)) return;
    const marked = products.some((p) => p.on_rack);
    const onRack = (marked ? products.filter((p) => p.on_rack) : products).slice(0, RACK_SIZE).some((p) => p.code === code);
    if (onRack) {
      setActiveCode(code);
      rackAnchor.current?.scrollIntoView({ block: "start" });
    } else setDialog({ kind: "details", code, fromGrid: true });
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
  // Rack: the suits marked "Rack" in the back office (or, if none are marked yet, the first 17 in product
  // order). Collection: every other matching suit.
  const anyOnRack = useMemo(() => products.some((p) => p.on_rack), [products]);
  const rackBase = useMemo(() => (anyOnRack ? shown.filter((p) => p.on_rack) : shown).slice(0, RACK_SIZE), [shown, anyOnRack]);
  const collection = useMemo(() => shown.filter((p) => !rackBase.includes(p)), [shown, rackBase]);
  const rack = rackBase;
  // A collection card opens the suit in a pop-up on the same page (details plus the shop actions).
  const openFromCollection = (code: string) => setDialog({ kind: "details", code, fromGrid: true });
  const dialogProduct = dialog ? products.find((p) => p.code === dialog.code) ?? null : null;

  const toggleSaved = (code: string) => {
    const on = !saved.includes(code);
    setSaved((list) => {
      const next = toggle(list, code);
      writeSaved(next);
      return next;
    });
    if (signedIn) void setFavourite(code, on);
  };

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
          products={rack}
          activeCode={activeCode}
          onActivate={setActiveCode}
          chosen={chosen}
          stitching={stitching}
          saved={saved}
          brandOfMonth={brandOfMonth}
          onToggleSaved={toggleSaved}
          onToggleChosen={toggleChosen}
          onAction={onAction}
          emptyMessage={collection.length > 0 ? t("rackEmptySeeBelow") : filters.occasion === "saved" ? t("noSaved") : t("noMatch")}
          emptyAction={
            filters.occasion === "saved" || collection.length > 0 ? undefined : (
              <button type="button" className="th-btn mt-3" onClick={openSourcing}>
                {t("requestAnyDesign")}
              </button>
            )
          }
        />
      )}

      {!loadFailed && <CollectionGrid products={collection} saved={saved} onOpen={openFromCollection} onToggleSaved={toggleSaved} />}

      {dialogProduct && (
        <>
          <DetailsDialog
            product={dialogProduct}
            open={dialog?.kind === "details"}
            onClose={closeDialog}
            actions={
              dialog?.fromGrid ? (
                <ProductActions
                  product={dialogProduct}
                  chosen={chosen.includes(dialogProduct.code)}
                  stitched={stitching.includes(dialogProduct.code)}
                  saved={saved.includes(dialogProduct.code)}
                  onToggleChosen={() => toggleChosen(dialogProduct.code)}
                  onToggleSaved={() => toggleSaved(dialogProduct.code)}
                  onTry={() => setDialog({ kind: "try", code: dialogProduct.code })}
                  onStitch={() => setDialog({ kind: "stitch", code: dialogProduct.code })}
                  onNotify={() => setDialog({ kind: "notify", code: dialogProduct.code })}
                  onShare={() => void share(dialogProduct)}
                />
              ) : undefined
            }
          />
          <StitchDialog
            product={dialogProduct}
            open={dialog?.kind === "stitch"}
            onClose={closeDialog}
            tailors={tailors}
            onToast={showToast}
          />
          <NotifyDialog product={dialogProduct} open={dialog?.kind === "notify"} onClose={closeDialog} />
        </>
      )}

      <TryOnDialog
        products={products}
        startCode={dialog?.kind === "try" ? dialog.code : null}
        open={dialog?.kind === "try"}
        onClose={closeDialog}
        face={face}
        onFace={setFace}
        onAdd={(code) => toggleChosen(code)}
        onNotify={(code) => setDialog({ kind: "notify", code })}
      />

      <StitchDialog product={null} open={tailorsOpen} onClose={() => setTailorsOpen(false)} tailors={tailors} onToast={showToast} />

      {toast && (
        <div className="th-toast" role="status">
          {toast}
        </div>
      )}
    </>
  );
}
