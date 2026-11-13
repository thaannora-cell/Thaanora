import { NextResponse, type NextRequest } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { isSameOrigin } from "@/lib/http";
import { allow, LIMITS, tooMany } from "@/lib/rate-limit";
import { isLocale } from "@/lib/site-gate";
import { normaliseSaudiMobile } from "@/lib/phone";
import { findLiveCode } from "@/lib/discounts";
import { getBundleRule } from "@/lib/offers";
import { getCheckoutSettings, getWhatsappNumber } from "@/lib/shop-data";
import { computeTotals, discountCandidates, type CheckoutPerks } from "@/lib/pricing";
import { getPerks, toCheckoutPerks } from "@/lib/customer/perks";
import { salePrice } from "@/lib/product";
import { getLiveCampaigns } from "@/lib/campaigns";
import { campaignSalePct } from "@/lib/campaign-pricing";
import { buildOrderMessage, type MessageLine } from "@/lib/order-message";
import { getAccount } from "@/lib/customer/account";
import { needsCall } from "@/lib/cod";
import { addressLine } from "@/lib/customer/addresses";
import { getSessionClient } from "@/lib/supabase/server";

const MAX_LINES = 20;
const MAX_QTY = 10;

type Fail = "invalid" | "name" | "phone" | "area" | "stock" | "unavailable" | "signin" | "discount";
const fail = (error: Fail, status = 400, extra: Record<string, unknown> = {}) =>
  NextResponse.json({ ok: false, error, ...extra }, { status });

const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

// Everything the browser sends is re-checked here: products, stock, prices, code, fees.
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return fail("invalid", 403);
  // At most 8 orders an hour from one visitor: stops scripts filling the order list.
  if (!(await allow(req.headers, "orders"))) return NextResponse.json({ ok: false, error: "too_many" }, tooMany(LIMITS.orders.seconds));

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

  const [settings, bundle, waNumber, productsRes, campaigns] = await Promise.all([
    getCheckoutSettings(),
    getBundleRule(),
    getWhatsappNumber(),
    supabase
      .from("products")
      .select("id, code, brand, name, price_sar, sale_pct, cost_pkr, stock, occasions")
      .in("code", [...wanted.keys()])
      .eq("visible", true),
    getLiveCampaigns(supabase),
  ]);
  // "Ask customers to sign in before ordering" (back office Settings): guests are refused here too.
  // Signed in to My Thaanora: the order goes into her account, with her Circle level, birthday gift
  // and personal offers worked out here from her account (never trusted from the browser).
  const account = await getAccount();
  const customerId = account.state === "customer" ? account.customer.id : null;
  if (settings.requireSignIn && !customerId) return fail("signin", 401);
  const perks: CheckoutPerks | null = account.state === "customer" ? toCheckoutPerks(await getPerks(account.customer.id, account.customer.birthday)) : null;

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
    // Same price as the rack: the suit's own sale or a live campaign, whichever is larger.
    const pct = campaignSalePct(p, campaigns);
    return { p, qty: w.qty, stitch: w.stitch, fullPrice: !(pct > 0), unit: salePrice({ price_sar: Number(p.price_sar), sale_pct: pct }) };
  });

  const codeRaw = text(body.discountCode, 32);
  const live = codeRaw ? await findLiveCode(supabase, codeRaw) : null;
  const giftBox = checkout.packaging === "gift_box";
  const isGift = checkout.isGift === true;

  // One discount per order: the best one, on full-price suits only. Silver and above: free gift box.
  const totals = computeTotals(
    priced.map((l) => ({ unitPrice: l.unit, qty: l.qty, fullPrice: l.fullPrice })),
    discountCandidates(bundle, live, perks),
    { packagingFee: giftBox && !perks?.freeGiftBox ? settings.giftBoxFee : 0, deliveryFee: area.fee, vatPct: settings.vatPct },
  );
  const d = totals.discount;
  const usedCode = d?.kind === "code" ? (live?.code ?? null) : null;

  // COD protection: refused at the door before → staff call to confirm before sending.
  const callFirst = await needsCall(supabase, phone);

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
        discount_code: usedCode, // a code counts as used only when it was the discount applied
        subtotal_sar: totals.subtotal,
        bundle_discount_sar: d?.kind === "bundle" ? d.amount : 0,
        code_discount_sar: d?.kind === "code" ? d.amount : 0,
        perk_discount_sar: d && (d.kind === "loyalty" || d.kind === "birthday" || d.kind === "personal") ? d.amount : 0,
        discount_kind: d?.kind ?? null,
        discount_pct: d?.pct ?? null,
        loyalty_level: perks?.level?.slug ?? null,
        customer_offer_id: d?.kind === "personal" ? d.ref : null,
        birthday_year: d?.kind === "birthday" ? Number(d.ref) : null,
        customer_id: customerId,
        needs_call: callFirst,
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

  // The birthday gift or personal offer was used by another order a moment ago: ask her to look again.
  if (error?.code === "23505") return fail("discount", 409);
  if (error || !created) return fail("unavailable", 503);

  // A saved address she chose: read again from her account (never trusted from the browser), and only
  // if it's for the delivery area she picked.
  let address: string | null = null;
  const addressId = typeof checkout.addressId === "string" ? checkout.addressId : "";
  if (customerId && /^[0-9a-f-]{36}$/i.test(addressId)) {
    const session = await getSessionClient();
    const { data: a } = await session.from("addresses").select("label, recipient_name, recipient_phone, area, district, details, lat, lng").eq("id", addressId).maybeSingle();
    if (a && a.area === area.area) {
      const who = [a.recipient_name, a.recipient_phone ? `0${String(a.recipient_phone).slice(4)}` : null].filter(Boolean).join(" ");
      const where = addressLine({ district: a.district, details: a.details, lat: a.lat === null ? null : Number(a.lat), lng: a.lng === null ? null : Number(a.lng) });
      address = [`${a.label}: ${who}`, where].filter(Boolean).join(" · ").slice(0, 600);
    }
  }
  if (address) await supabase.from("orders").update({ address }).eq("id", created.new_order_id);
  const linked = customerId !== null;

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
    giftBox,
    gift,
    area: area.area,
    customerName: name,
    customerPhone: phone,
    vatPct: settings.vatPct,
    address,
  });

  return NextResponse.json(
    {
      ok: true,
      orderNo: created.new_order_no,
      total: totals.total,
      linked,
      codeDropped: Boolean(codeRaw) && !usedCode,
      needsCall: callFirst,
      message,
      whatsappUrl: waNumber ? `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}` : null,
    },
    { status: 201 },
  );
}
