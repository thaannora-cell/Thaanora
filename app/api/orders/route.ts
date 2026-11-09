import { NextResponse, type NextRequest } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { isSameOrigin } from "@/lib/http";
import { isLocale } from "@/lib/site-gate";
import { normaliseSaudiMobile } from "@/lib/phone";
import { findLiveCode } from "@/lib/discounts";
import { getBundleRule } from "@/lib/offers";
import { getCheckoutSettings, getWhatsappNumber } from "@/lib/shop-data";
import { computeTotals } from "@/lib/pricing";
import { salePrice } from "@/lib/product";
import { buildOrderMessage, type MessageLine } from "@/lib/order-message";

const MAX_LINES = 20;
const MAX_QTY = 10;

type Fail = "invalid" | "name" | "phone" | "area" | "stock" | "unavailable";
const fail = (error: Fail, status = 400, extra: Record<string, unknown> = {}) =>
  NextResponse.json({ ok: false, error, ...extra }, { status });

const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

// Everything the browser sends is re-checked here: products, stock, prices, code, fees.
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return fail("invalid", 403);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return fail("invalid");
  }
  if (text(body.website, 100)) return NextResponse.json({ ok: true, orderNo: null, whatsappUrl: null, message: "" });

  const locale = isLocale(body.locale) ? body.locale : "en";
  const customer = (body.customer ?? {}) as Record<string, unknown>;
  const checkout = (body.checkout ?? {}) as Record<string, unknown>;
  const rawLines = Array.isArray(body.lines) ? body.lines.slice(0, MAX_LINES + 1) : [];

  const name = text(customer.name, 80);
  const phone = normaliseSaudiMobile(text(customer.phone, 30));
  if (name.length < 2) return fail("name");
  if (!phone) return fail("phone");
  if (rawLines.length === 0 || rawLines.length > MAX_LINES) return fail("invalid");

  const wanted = new Map<string, { qty: number; stitch: boolean }>();
  for (const l of rawLines as Record<string, unknown>[]) {
    const code = text(l?.code, 64);
    const qty = Number(l?.qty);
    if (!code || !Number.isInteger(qty) || qty < 1 || qty > MAX_QTY || wanted.has(code)) return fail("invalid");
    wanted.set(code, { qty, stitch: l?.stitch === true });
  }

  const supabase = getAdminClient();
  if (!supabase) return fail("unavailable", 503);

  const [settings, bundle, waNumber, productsRes] = await Promise.all([
    getCheckoutSettings(),
    getBundleRule(),
    getWhatsappNumber(),
    supabase
      .from("products")
      .select("id, code, brand, name, price_sar, sale_pct, cost_pkr, stock")
      .in("code", [...wanted.keys()])
      .eq("visible", true),
  ]);

  const area = settings.areas.find((a) => a.area === checkout.area);
  if (!area) return fail("area");

  const products = productsRes.data ?? [];
  const shortages = [...wanted.entries()]
    .filter(([code, w]) => {
      const p = products.find((x) => x.code === code);
      return !p || p.stock < w.qty;
    })
    .map(([code]) => code);
  if (shortages.length) return fail("stock", 409, { codes: shortages });

  const priced = [...wanted.entries()].map(([code, w]) => {
    const p = products.find((x) => x.code === code)!;
    return { p, qty: w.qty, stitch: w.stitch, unit: salePrice(p) };
  });

  const codeRaw = text(body.discountCode, 32);
  const live = codeRaw ? await findLiveCode(supabase, codeRaw) : null;
  const giftBox = checkout.packaging === "gift_box";
  const isGift = checkout.isGift === true;

  const totals = computeTotals(
    priced.map((l) => ({ unitPrice: l.unit, qty: l.qty })),
    bundle,
    live?.percent ?? 0,
    { packagingFee: giftBox ? settings.giftBoxFee : 0, deliveryFee: area.fee, vatPct: settings.vatPct },
  );

  const gift = isGift
    ? { recipientName: text(checkout.recipientName, 80), recipientArea: text(checkout.recipientArea, 80), note: text(checkout.giftNote, 300) }
    : null;

  const { data: created, error } = await supabase
    .rpc("create_order", {
      p_order: {
        customer_name: name,
        customer_phone: phone,
        language: locale,
        area: area.area,
        packaging: giftBox ? "gift_box" : "suit_keeper_bag",
        is_gift: isGift,
        gift_note: gift?.note || null,
        recipient_name: gift?.recipientName || null,
        recipient_area: gift?.recipientArea || null,
        discount_code: live?.code ?? null,
        subtotal_sar: totals.subtotal,
        bundle_discount_sar: totals.bundleDiscount,
        code_discount_sar: totals.codeDiscount,
        packaging_fee_sar: totals.packagingFee,
        delivery_fee_sar: totals.deliveryFee,
        total_sar: totals.total,
        vat_sar: totals.vat,
      },
      p_items: priced.map((l) => ({
        product_id: l.p.id,
        product_code: l.p.code,
        product_name: l.p.name,
        unit_price_sar: l.unit,
        unit_cost_pkr: l.p.cost_pkr,
        qty: l.qty,
        wants_stitching: l.stitch,
      })),
    })
    .single<{ new_order_id: string; new_order_no: string }>();

  if (error || !created) return fail("unavailable", 503);

  const lines: MessageLine[] = priced.map((l) => ({
    name: l.p.name,
    brand: l.p.brand,
    code: l.p.code,
    qty: l.qty,
    amount: l.unit * l.qty,
    stitch: l.stitch,
  }));
  const message = await buildOrderMessage({
    locale,
    orderNo: created.new_order_no,
    lines,
    totals,
    bundlePct: bundle?.pct ?? null,
    discountCode: live?.code ?? null,
    giftBox,
    gift,
    area: area.area,
    customerName: name,
    customerPhone: phone,
    vatPct: settings.vatPct,
  });

  return NextResponse.json(
    {
      ok: true,
      orderNo: created.new_order_no,
      total: totals.total,
      codeDropped: Boolean(codeRaw) && !live,
      message,
      whatsappUrl: waNumber ? `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}` : null,
    },
    { status: 201 },
  );
}
