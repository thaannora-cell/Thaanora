"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { salePrice, type PublicProduct } from "@/lib/product";
import { computeTotals, type BundleRule, type CheckoutSettings, type Totals } from "@/lib/pricing";

export type Line = { code: string; qty: number; stitch: boolean };
export type AppliedCode = { code: string; percent: number };
export type CodeResult = "applied" | "invalid" | "error";
export type PlacedOrder = { orderNo: string; message: string; whatsappUrl: string | null };
export type Packaging = "suit_keeper_bag" | "gift_box";
export type Checkout = {
  packaging: Packaging;
  isGift: boolean;
  recipientName: string;
  recipientArea: string;
  giftNote: string;
  area: string;
  customerName: string;
  customerPhone: string;
};

const EMPTY_CHECKOUT: Checkout = { packaging: "suit_keeper_bag", isGift: false, recipientName: "", recipientArea: "", giftNote: "", area: "", customerName: "", customerPhone: "" };

type SelectionContext = {
  lines: Line[];
  products: Map<string, PublicProduct>;
  bundle: BundleRule | null;
  settings: CheckoutSettings;
  checkout: Checkout;
  updateCheckout: (patch: Partial<Checkout>) => void;
  totals: Totals;
  appliedCode: AppliedCode | null;
  has: (code: string) => boolean;
  stitched: (code: string) => boolean;
  toggle: (code: string) => "added" | "removed";
  add: (code: string, opts?: { stitch?: boolean }) => void;
  setQty: (code: string, qty: number) => void;
  setStitch: (code: string, stitch: boolean) => void;
  applyCode: (code: string) => Promise<CodeResult>;
  removeCode: () => void;
  placedOrder: PlacedOrder | null;
  orderPlaced: (order: PlacedOrder) => void;
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
};

const Ctx = createContext<SelectionContext | null>(null);

export const useSelection = () => useContext(Ctx);

const LINES_KEY = "th_selection";
const CODE_KEY = "th_code";
const CHECKOUT_KEY = "th_checkout";

function readJson<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage blocked (private mode): the selection still works for this visit.
  }
}

async function checkCode(code: string): Promise<AppliedCode | "invalid" | "error"> {
  try {
    const res = await fetch("/api/discount", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    if (!res.ok) return "error";
    const data = (await res.json()) as { ok?: boolean; code?: string; percent?: number };
    return data.ok && data.code && data.percent ? { code: data.code, percent: data.percent } : "invalid";
  } catch {
    return "error";
  }
}

const maxQty = (p: PublicProduct | undefined) => Math.max(0, p?.stock ?? 0);

type Props = { products: PublicProduct[]; bundle: BundleRule | null; settings: CheckoutSettings; children: React.ReactNode };

export default function SelectionProvider({ products: list, bundle, settings, children }: Props) {
  const products = useMemo(() => new Map(list.map((p) => [p.code, p])), [list]);
  const [lines, setLines] = useState<Line[]>([]);
  const [appliedCode, setAppliedCode] = useState<AppliedCode | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [checkout, setCheckout] = useState<Checkout>(EMPTY_CHECKOUT);
  const [placedOrder, setPlacedOrder] = useState<PlacedOrder | null>(null);
  const loaded = useRef(false);

  // Restore from the device, dropping suits that are gone or sold out, and re-checking the code.
  useEffect(() => {
    const saved = readJson<Line[]>(LINES_KEY);
    if (Array.isArray(saved)) {
      setLines(
        saved
          .filter((l) => l && typeof l.code === "string" && maxQty(products.get(l.code)) > 0)
          .map((l) => ({
            code: l.code,
            qty: Math.min(Math.max(1, Math.floor(Number(l.qty) || 1)), maxQty(products.get(l.code))),
            stitch: Boolean(l.stitch),
          })),
      );
    }
    const savedCheckout = readJson<Partial<Checkout>>(CHECKOUT_KEY);
    if (savedCheckout && typeof savedCheckout === "object") {
      const str = (v: unknown) => (typeof v === "string" ? v.slice(0, 500) : "");
      setCheckout({
        packaging: savedCheckout.packaging === "gift_box" ? "gift_box" : "suit_keeper_bag",
        isGift: Boolean(savedCheckout.isGift),
        recipientName: str(savedCheckout.recipientName),
        recipientArea: str(savedCheckout.recipientArea),
        giftNote: str(savedCheckout.giftNote),
        area: settings.areas.some((a) => a.area === savedCheckout.area) ? str(savedCheckout.area) : "",
        customerName: str(savedCheckout.customerName),
        customerPhone: str(savedCheckout.customerPhone),
      });
    }
    const savedCode = readJson<string>(CODE_KEY);
    if (typeof savedCode === "string") {
      void checkCode(savedCode).then((r) => {
        if (typeof r === "object") setAppliedCode(r);
        else if (r === "invalid") writeJson(CODE_KEY, null);
      });
    }
    loaded.current = true;
  }, [products, settings.areas]);

  useEffect(() => {
    if (loaded.current) writeJson(LINES_KEY, lines);
  }, [lines]);

  useEffect(() => {
    if (loaded.current) writeJson(CHECKOUT_KEY, checkout);
  }, [checkout]);

  const updateCheckout = useCallback((patch: Partial<Checkout>) => setCheckout((c) => ({ ...c, ...patch })), []);
  const deliveryFee = settings.areas.find((a) => a.area === checkout.area)?.fee ?? 0;
  const packagingFee = checkout.packaging === "gift_box" ? settings.giftBoxFee : 0;

  const totals = useMemo(
    () =>
      computeTotals(
        lines.flatMap((l) => {
          const p = products.get(l.code);
          return p ? [{ unitPrice: salePrice(p), qty: l.qty }] : [];
        }),
        bundle,
        appliedCode?.percent ?? 0,
        { packagingFee, deliveryFee, vatPct: settings.vatPct },
      ),
    [lines, products, bundle, appliedCode, packagingFee, deliveryFee, settings.vatPct],
  );

  const has = useCallback((code: string) => lines.some((l) => l.code === code), [lines]);
  const stitched = useCallback((code: string) => lines.some((l) => l.code === code && l.stitch), [lines]);

  const add = useCallback(
    (code: string, opts?: { stitch?: boolean }) => {
      if (maxQty(products.get(code)) < 1) return;
      setLines((ls) =>
        ls.some((l) => l.code === code)
          ? ls.map((l) => (l.code === code && opts?.stitch ? { ...l, stitch: true } : l))
          : [...ls, { code, qty: 1, stitch: Boolean(opts?.stitch) }],
      );
    },
    [products],
  );

  const toggle = useCallback(
    (code: string) => {
      if (lines.some((l) => l.code === code)) {
        setLines((ls) => ls.filter((l) => l.code !== code));
        return "removed" as const;
      }
      add(code);
      return "added" as const;
    },
    [lines, add],
  );

  const setQty = useCallback(
    (code: string, qty: number) => {
      const max = maxQty(products.get(code));
      setLines((ls) =>
        qty < 1 ? ls.filter((l) => l.code !== code) : ls.map((l) => (l.code === code ? { ...l, qty: Math.min(qty, max) } : l)),
      );
    },
    [products],
  );

  const setStitch = useCallback((code: string, stitch: boolean) => {
    setLines((ls) => ls.map((l) => (l.code === code ? { ...l, stitch } : l)));
  }, []);

  const applyCode = useCallback(async (code: string): Promise<CodeResult> => {
    const r = await checkCode(code);
    if (typeof r === "object") {
      setAppliedCode(r);
      writeJson(CODE_KEY, r.code);
      return "applied";
    }
    return r;
  }, []);

  const removeCode = useCallback(() => {
    setAppliedCode(null);
    writeJson(CODE_KEY, null);
  }, []);

  // After an order is placed: empty the bag and the code, keep her name, phone and area for next time.
  const orderPlaced = useCallback((order: PlacedOrder) => {
    setPlacedOrder(order);
    setLines([]);
    setAppliedCode(null);
    writeJson(CODE_KEY, null);
    setCheckout((c) => ({ ...EMPTY_CHECKOUT, area: c.area, customerName: c.customerName, customerPhone: c.customerPhone }));
  }, []);

  const value: SelectionContext = {
    lines,
    products,
    bundle,
    settings,
    checkout,
    updateCheckout,
    totals,
    appliedCode,
    has,
    stitched,
    toggle,
    add,
    setQty,
    setStitch,
    applyCode,
    removeCode,
    placedOrder,
    orderPlaced,
    drawerOpen,
    openDrawer: () => setDrawerOpen(true),
    closeDrawer: () => {
      setDrawerOpen(false);
      setPlacedOrder(null);
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
