import { NextResponse, type NextRequest } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { normaliseSaudiMobile } from "@/lib/phone";
import { isLocale } from "@/lib/site-gate";
import { isSameOrigin } from "@/lib/http";
import { allow, LIMITS, tooMany } from "@/lib/rate-limit";
import { getWhatsappNumber } from "@/lib/shop-data";
import { buildRequestMessage } from "@/lib/request-message";
import type { Locale } from "@/i18n/routing";
import { currentCustomerId } from "@/lib/customer/account";

const SCREENSHOT_BUCKET = "request-screenshots";
const MAX_SCREENSHOT_BYTES = 4 * 1024 * 1024; // Vercel limits request bodies to ~4.5 MB

const bad = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });
const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

// Short, human reference for WhatsApp, e.g. R-3F9A1C.
import { refOf } from "@/lib/request-ref";

// Trust the file's first bytes, not its name or the browser's claimed type.
function sniffImage(b: Uint8Array): { ext: string; mime: string } | null {
  const ascii = (from: number, to: number) => String.fromCharCode(...b.slice(from, to));
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: "jpg", mime: "image/jpeg" };
  if (b[0] === 0x89 && ascii(1, 4) === "PNG") return { ext: "png", mime: "image/png" };
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return { ext: "webp", mime: "image/webp" };
  if (ascii(4, 8) === "ftyp" && /^(heic|heix|hevc|mif1|msf1)$/.test(ascii(8, 12))) return { ext: "heic", mime: "image/heic" };
  return null;
}

async function respond(
  id: string,
  locale: Locale,
  message: Parameters<typeof buildRequestMessage>[1],
) {
  const wa = await getWhatsappNumber();
  const text = await buildRequestMessage(locale, message);
  return NextResponse.json(
    {
      ok: true,
      reference: refOf(id),
      message: text,
      whatsappUrl: wa ? `https://wa.me/${wa}?text=${encodeURIComponent(text)}` : null,
    },
    { status: 201 },
  );
}

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return bad("forbidden", 403);
  // At most 6 requests an hour from one visitor (each may carry a screenshot upload).
  if (!(await allow(req.headers, "requests"))) return NextResponse.json({ ok: false, error: "too_many" }, tooMany(LIMITS.requests.seconds));
  const isForm = (req.headers.get("content-type") ?? "").includes("multipart/form-data");

  let fields: Record<string, unknown>;
  let file: File | null = null;
  try {
    if (isForm) {
      const form = await req.formData();
      fields = Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string"));
      const f = form.get("screenshot");
      file = f instanceof File && f.size > 0 ? f : null;
    } else {
      fields = await req.json();
    }
  } catch {
    return bad("invalid");
  }

  // Bots fill every field; people never see this one.
  if (text(fields.website, 100)) return NextResponse.json({ ok: true, reference: null, message: "", whatsappUrl: null });

  const locale: Locale = isLocale(fields.locale) ? fields.locale : "en";
  const phone = normaliseSaudiMobile(text(fields.phone, 30));
  const name = text(fields.name, 80);
  if (!phone) return bad("phone");

  const supabase = getAdminClient();
  if (!supabase) return bad("unavailable", 503);

  // ── Sold-out suit: notify me / pre-order ──
  if (fields.type === "notify_me" || fields.type === "preorder") {
    const code = text(fields.productCode, 64);
    const { data: product } = await supabase.from("products").select("id, code, name").eq("code", code).eq("visible", true).maybeSingle();
    if (!product) return bad("invalid");
    const { data: row, error } = await supabase
      .from("requests")
      .insert({
        type: fields.type,
        product_id: product.id,
        customer_phone: phone,
        customer_name: name || null,
        language: locale,
        details: `${product.code} · ${product.name}`,
        customer_id: await currentCustomerId(),
      })
      .select("id")
      .single();
    if (error || !row) return bad("unavailable", 503);
    return respond(row.id, locale, {
      kind: fields.type,
      reference: refOf(row.id),
      productName: product.name,
      productCode: product.code,
      name,
      phone,
    });
  }

  // ── Can't find your suit? ──
  if (fields.type !== "sourcing") return bad("invalid");
  const brand = text(fields.brand, 80);
  const link = text(fields.reference, 300);
  const notes = text(fields.notes, 500);
  const quantity = Math.min(50, Math.max(1, Math.floor(Number(fields.quantity) || 1)));

  let screenshot: { bytes: Uint8Array; ext: string; mime: string } | null = null;
  if (file) {
    if (file.size > MAX_SCREENSHOT_BYTES) return bad("too_big", 413);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const kind = sniffImage(bytes);
    if (!kind) return bad("not_image");
    screenshot = { bytes, ...kind };
  }
  if (!link && !screenshot) return bad("need_design");

  let screenshotPath: string | null = null;
  if (screenshot) {
    screenshotPath = `${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.${screenshot.ext}`;
    const { error } = await supabase.storage
      .from(SCREENSHOT_BUCKET)
      .upload(screenshotPath, screenshot.bytes, { contentType: screenshot.mime, upsert: false });
    if (error) return bad("unavailable", 503);
  }

  const { data: row, error } = await supabase
    .from("requests")
    .insert({
      type: "sourcing",
      customer_phone: phone,
      customer_name: name || null,
      brand: brand || null,
      reference: link || null,
      quantity,
      details: notes || null,
      screenshot_path: screenshotPath,
      language: locale,
      customer_id: await currentCustomerId(),
    })
    .select("id")
    .single();
  if (error || !row) {
    if (screenshotPath) await supabase.storage.from(SCREENSHOT_BUCKET).remove([screenshotPath]);
    return bad("unavailable", 503);
  }

  return respond(row.id, locale, {
    kind: "sourcing",
    reference: refOf(row.id),
    brand,
    link,
    quantity,
    notes,
    hasScreenshot: Boolean(screenshotPath),
    name,
    phone,
  });
}
