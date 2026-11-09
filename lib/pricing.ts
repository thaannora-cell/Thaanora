// Order totals. Prices are SAR and already include VAT. Shared by the browser and (later) the order route.

export type BundleRule = { qty: number; pct: number };
export type DeliveryArea = { area: string; fee: number };
export type CheckoutSettings = { areas: DeliveryArea[]; giftBoxFee: number; vatPct: number; tailorDiscountPct: number };

export type Totals = {
  count: number;
  subtotal: number;
  bundleDiscount: number;
  codeDiscount: number;
  packagingFee: number;
  deliveryFee: number;
  total: number;
  vat: number; // the VAT already inside the total
};

export function computeTotals(
  lines: { unitPrice: number; qty: number }[],
  bundle: BundleRule | null,
  codePct: number,
  extras: { packagingFee?: number; deliveryFee?: number; vatPct?: number } = {},
): Totals {
  const count = lines.reduce((n, l) => n + l.qty, 0);
  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
  const bundleDiscount = bundle && count >= bundle.qty ? Math.round((subtotal * bundle.pct) / 100) : 0;
  const codeDiscount = codePct > 0 ? Math.round(((subtotal - bundleDiscount) * codePct) / 100) : 0;
  const packagingFee = count > 0 ? extras.packagingFee ?? 0 : 0;
  const deliveryFee = count > 0 ? extras.deliveryFee ?? 0 : 0;
  const total = subtotal - bundleDiscount - codeDiscount + packagingFee + deliveryFee;
  const vatPct = extras.vatPct ?? 0;
  const vat = vatPct > 0 ? Math.round(((total * vatPct) / (100 + vatPct)) * 100) / 100 : 0;
  return { count, subtotal, bundleDiscount, codeDiscount, packagingFee, deliveryFee, total, vat };
}
