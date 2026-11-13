// Returns: reasons, choices and the refund amount. Pure: safe in server and browser code.
import { shareDiscount } from "@/lib/invoice-build";

export const RETURN_REASONS = ["changed_mind", "wrong_item", "faulty", "not_as_pictured", "other"] as const;
export type ReturnReason = (typeof RETURN_REASONS)[number];
export const RESOLUTIONS = ["refund", "exchange"] as const;
export type Resolution = (typeof RESOLUTIONS)[number];
export const RETURN_STATUSES = ["requested", "approved", "rejected", "received", "refunded", "exchanged", "cancelled"] as const;
export type ReturnStatus = (typeof RETURN_STATUSES)[number];

// Wrong or faulty suit: our mistake, so the delivery fee (and gift box) is refunded too (owner's rule).
export const OUR_FAULT: ReturnReason[] = ["wrong_item", "faulty"];

export const isReason = (v: unknown): v is ReturnReason => typeof v === "string" && (RETURN_REASONS as readonly string[]).includes(v);
export const isResolution = (v: unknown): v is Resolution => typeof v === "string" && (RESOLUTIONS as readonly string[]).includes(v);

export type RefundLine = { orderItemId: string; code: string; name: string; unitPaid: number; qty: number };

const r2 = (n: number) => Math.round(n * 100) / 100;

// What she gets back for the suits she returns: the price she actually paid per suit (the order's one
// discount shared across the suits, as on the invoice), plus delivery and packaging when it's our fault.
// The same unit amounts go on the Zoho credit note, so they always add up to the refund.
export function computeRefund(
  order: {
    items: { id: string; code: string; name: string; unitPrice: number; qty: number }[];
    discount: number; // the order's discount in SAR (bundle + code + perk)
    deliveryFee: number;
    packagingFee: number;
  },
  returning: { orderItemId: string; qty: number }[],
  reason: ReturnReason,
): { lines: RefundLine[]; extras: { delivery: number; packaging: number }; total: number } {
  const shares = shareDiscount(order.items.map((i) => i.unitPrice * i.qty), order.discount);
  const lines: RefundLine[] = [];
  for (const want of returning) {
    const n = order.items.findIndex((i) => i.id === want.orderItemId);
    if (n < 0) continue;
    const item = order.items[n];
    const qty = Math.min(Math.max(0, Math.floor(want.qty)), item.qty);
    if (qty < 1) continue;
    lines.push({ orderItemId: item.id, code: item.code, name: item.name, unitPaid: r2(item.unitPrice - shares[n] / item.qty), qty });
  }
  const fault = OUR_FAULT.includes(reason);
  const extras = { delivery: fault ? order.deliveryFee : 0, packaging: fault ? order.packagingFee : 0 };
  const total = r2(lines.reduce((s, l) => s + l.unitPaid * l.qty, 0) + extras.delivery + extras.packaging);
  return { lines, extras, total };
}
