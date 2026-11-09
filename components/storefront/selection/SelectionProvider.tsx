"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { salePrice, type PublicProduct } from "@/lib/product";
import { computeTotals, type BundleRule, type Totals } from "@/lib/pricing";

export type Line = { code: string; qty: number; stitch: boolean };
export type AppliedCode = { code: string; percent: number };
export type CodeResult = "applied" | "invalid" | "error";

type SelectionContext = {
  lines: Line[];
  products: Map<string, PublicProduct>;
  bundle: BundleRule | null;
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
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
};

const Ctx = createContext<SelectionContext | null>(null);

export const useSelection = () => useContext(Ctx);

const LINES_KEY = "th_selection";
const CODE_KEY = "th_code";

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

type Props = { products: PublicProduct[]; bundle: BundleRule | null; children: React.ReactNode };

export default function SelectionProvider({ products: list, bundle, children }: Props) {
  const products = useMemo(() => new Map(list.map((p) => [p.code, p])), [list]);
  const [lines, setLines] = useState<Line[]>([]);
  const [appliedCode, setAppliedCode] = useState<AppliedCode | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
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
    const savedCode = readJson<string>(CODE_KEY);
    if (typeof savedCode === "string") {
      void checkCode(savedCode).then((r) => {
        if (typeof r === "object") setAppliedCode(r);
        else if (r === "invalid") writeJson(CODE_KEY, null);
      });
    }
    loaded.current = true;
  }, [products]);

  useEffect(() => {
    if (loaded.current) writeJson(LINES_KEY, lines);
  }, [lines]);

  const totals = useMemo(
    () =>
      computeTotals(
        lines.flatMap((l) => {
          const p = products.get(l.code);
          return p ? [{ unitPrice: salePrice(p), qty: l.qty }] : [];
        }),
        bundle,
        appliedCode?.percent ?? 0,
      ),
    [lines, products, bundle, appliedCode],
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

  const value: SelectionContext = {
    lines,
    products,
    bundle,
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
    drawerOpen,
    openDrawer: () => setDrawerOpen(true),
    closeDrawer: () => setDrawerOpen(false),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
