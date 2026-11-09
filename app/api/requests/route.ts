import { NextResponse, type NextRequest } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { normaliseSaudiMobile } from "@/lib/phone";
import { isLocale } from "@/lib/site-gate";
import { isSameOrigin } from "@/lib/http";

const TYPES = ["notify_me", "preorder"] as const;
type RequestType = (typeof TYPES)[number];

const bad = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return bad("forbidden", 403);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return bad("invalid");
  }

  // Bots fill every field; people never see this one.
  if (typeof body.website === "string" && body.website.trim() !== "") return NextResponse.json({ ok: true });

  const type = TYPES.find((t) => t === body.type) as RequestType | undefined;
  const code = typeof body.productCode === "string" ? body.productCode.trim().slice(0, 64) : "";
  const phone = typeof body.phone === "string" ? normaliseSaudiMobile(body.phone) : null;
  const locale = isLocale(body.locale) ? body.locale : "en";
  if (!type || !code) return bad("invalid");
  if (!phone) return bad("phone");

  const supabase = getAdminClient();
  if (!supabase) return bad("unavailable", 503);

  const { data: product } = await supabase
    .from("products")
    .select("id, code, name")
    .eq("code", code)
    .eq("visible", true)
    .maybeSingle();
  if (!product) return bad("invalid");

  const { error } = await supabase.from("requests").insert({
    type,
    product_id: product.id,
    customer_phone: phone,
    details: `${product.code} · ${product.name} · language: ${locale}`,
  });
  if (error) return bad("unavailable", 503);

  return NextResponse.json({ ok: true }, { status: 201 });
}
