// Order totals. Prices are SAR and already include VAT. Shared by the browser and (later) the order route.

export type BundleRule = { qty: number; pct: number };

export type Totals = {
  count: number;
  subtotal: number;
  bundleDiscount: number;
  codeDiscount: number;
  total: number;
};

export function computeTotals(
  lines: { unitPrice: number; qty: number }[],
  bundle: BundleRule | null,
  codePct: number,
): Totals {
  const count = lines.reduce((n, l) => n + l.qty, 0);
  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
  const bundleDiscount = bundle && count >= bundle.qty ? Math.round((subtotal * bundle.pct) / 100) : 0;
  const codeDiscount = codePct > 0 ? Math.round(((subtotal - bundleDiscount) * codePct) / 100) : 0;
  return { count, subtotal, bundleDiscount, codeDiscount, total: subtotal - bundleDiscount - codeDiscount };
}
