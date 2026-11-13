// Turns a delivered order into a Zoho Books invoice. Plain maths, no network, so it can be tested.
// Prices on the website already include VAT, so the invoice is "tax inclusive": every line's rate is the
// price the customer saw, and Zoho works out the VAT inside it.

export type InvoiceOrder = {
  orderNo: string;
  area: string;
  items: { code: string; name: string; unitPrice: number; qty: number }[];
  bundleDiscount: number;
  codeDiscount: number;
  perkDiscount?: number; // Circle level, birthday gift or personal offer
  discountCode: string | null;
  packagingFee: number;
  deliveryFee: number;
  total: number;
};

export type InvoiceLabels = { giftBox: string; delivery: string; notes: string };

export type ZohoLine = { name: string; description?: string; rate: number; quantity: number; discount?: number; tax_id?: string };

const cents = (n: number) => Math.round(n * 100);
const sar = (c: number) => c / 100;

// The order's discount (bundle, code, Circle level, birthday gift or personal offer) apply to the suits only. Zoho has no "discount on these lines"
// for tax-inclusive invoices that keeps VAT right, so the discount is shared out across the suit lines
// in proportion to their value (to the halala), and the last line takes the rounding.
export function shareDiscount(lineTotals: number[], discount: number): number[] {
  const totals = lineTotals.map(cents);
  const sum = totals.reduce((a, b) => a + b, 0);
  const want = Math.min(cents(discount), sum);
  if (want <= 0 || sum <= 0) return totals.map(() => 0);
  const out = totals.map((t) => Math.floor((t * want) / sum));
  let left = want - out.reduce((a, b) => a + b, 0);
  for (let i = out.length - 1; left > 0 && i >= 0; i--) {
    const room = totals[i] - out[i];
    const add = Math.min(room, left);
    out[i] += add;
    left -= add;
  }
  return out.map(sar);
}

export function buildInvoice(
  o: InvoiceOrder,
  opts: { customerId: string; date: string; taxId: string | null; labels: InvoiceLabels },
) {
  const tax = opts.taxId ? { tax_id: opts.taxId } : {};
  const discounts = shareDiscount(
    o.items.map((i) => i.unitPrice * i.qty),
    o.bundleDiscount + o.codeDiscount + (o.perkDiscount ?? 0),
  );
  const lines: ZohoLine[] = o.items.map((i, n) => ({
    name: i.name.slice(0, 100),
    description: i.code,
    rate: i.unitPrice,
    quantity: i.qty,
    ...(discounts[n] > 0 ? { discount: discounts[n] } : {}),
    ...tax,
  }));
  if (o.packagingFee > 0) lines.push({ name: opts.labels.giftBox, rate: o.packagingFee, quantity: 1, ...tax });
  if (o.deliveryFee > 0) lines.push({ name: opts.labels.delivery, description: o.area, rate: o.deliveryFee, quantity: 1, ...tax });

  return {
    customer_id: opts.customerId,
    reference_number: o.orderNo,
    date: opts.date,
    is_inclusive_tax: Boolean(opts.taxId),
    discount_type: "item_level",
    line_items: lines,
    notes: opts.labels.notes,
  };
}

// What the invoice should add up to, from the lines (to check Zoho agrees with the order).
export function expectedTotal(body: ReturnType<typeof buildInvoice>): number {
  return sar(body.line_items.reduce((s, l) => s + cents(l.rate) * l.quantity - cents(l.discount ?? 0), 0));
}
