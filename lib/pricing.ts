// Order totals. Prices are SAR and already include VAT. Shared by the browser and the order route, so
// the bag shows exactly what the server will charge.
//
// The discount rule (owner, 13 Nov 2026): an order gets ONE extra discount, the best of Circle level,
// bundle, code, birthday gift or a personal offer, and only on suits at full price. A suit on sale or
// in a campaign keeps that price and gets no extra.

export type BundleRule = { qty: number; pct: number };
export type DeliveryArea = { area: string; fee: number };
export type CheckoutSettings = { areas: DeliveryArea[]; giftBoxFee: number; vatPct: number; tailorDiscountPct: number; requireSignIn: boolean };

export type DiscountKind = "loyalty" | "bundle" | "personal" | "birthday" | "code";

// What a signed-in customer brings to the checkout (worked out on the server from her account).
export type CheckoutPerks = {
  level: { slug: string; pct: number } | null;
  freeGiftBox: boolean;
  birthday: { pct: number; year: number } | null; // only while her gift window is open and unused
  offers: { id: string; pct: number }[]; // personal offers she can use now
};

export type Candidate = { kind: DiscountKind; pct: number; ref?: string; minQty?: number };
export type AppliedDiscount = Candidate & { amount: number };

export type Totals = {
  count: number;
  subtotal: number;
  fullPriceSubtotal: number; // the part a discount can apply to
  discount: AppliedDiscount | null;
  packagingFee: number;
  deliveryFee: number;
  total: number;
  vat: number; // the VAT already inside the total
};

// Every discount she could get on this order. On a tie, the earlier one wins, so a code or a one-time
// gift is kept for later when her Circle level or the bundle gives the same.
export function discountCandidates(bundle: BundleRule | null, code: { code: string; percent: number } | null, perks: CheckoutPerks | null): Candidate[] {
  const out: Candidate[] = [];
  if (perks?.level && perks.level.pct > 0) out.push({ kind: "loyalty", pct: perks.level.pct, ref: perks.level.slug });
  if (bundle && bundle.pct > 0) out.push({ kind: "bundle", pct: bundle.pct, minQty: bundle.qty });
  for (const o of perks?.offers ?? []) if (o.pct > 0) out.push({ kind: "personal", pct: o.pct, ref: o.id });
  if (perks?.birthday && perks.birthday.pct > 0) out.push({ kind: "birthday", pct: perks.birthday.pct, ref: String(perks.birthday.year) });
  if (code && code.percent > 0) out.push({ kind: "code", pct: code.percent, ref: code.code });
  return out;
}

export function computeTotals(
  lines: { unitPrice: number; qty: number; fullPrice: boolean }[],
  candidates: Candidate[],
  extras: { packagingFee?: number; deliveryFee?: number; vatPct?: number } = {},
): Totals {
  const count = lines.reduce((n, l) => n + l.qty, 0);
  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
  const fullPriceSubtotal = lines.reduce((s, l) => s + (l.fullPrice ? l.unitPrice * l.qty : 0), 0);

  let best: Candidate | null = null;
  for (const c of candidates) {
    if (c.minQty && count < c.minQty) continue;
    if (!best || c.pct > best.pct) best = c;
  }
  const amount = best && fullPriceSubtotal > 0 ? Math.round((fullPriceSubtotal * best.pct) / 100) : 0;
  const discount = best && amount > 0 ? { ...best, amount } : null;

  const packagingFee = count > 0 ? extras.packagingFee ?? 0 : 0;
  const deliveryFee = count > 0 ? extras.deliveryFee ?? 0 : 0;
  const total = subtotal - (discount?.amount ?? 0) + packagingFee + deliveryFee;
  const vatPct = extras.vatPct ?? 0;
  const vat = vatPct > 0 ? Math.round(((total * vatPct) / (100 + vatPct)) * 100) / 100 : 0;
  return { count, subtotal, fullPriceSubtotal, discount, packagingFee, deliveryFee, total, vat };
}
