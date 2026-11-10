import { NextResponse, type NextRequest } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { isSameOrigin } from "@/lib/http";
import { findLiveCode } from "@/lib/discounts";
import { allow, LIMITS, tooMany } from "@/lib/rate-limit";

// Checks one code at a time; the list of codes is never sent to the browser.
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  // At most 10 code checks per 10 minutes from one visitor, so codes can't be guessed by trying many.
  if (!(await allow(req.headers, "discount"))) return NextResponse.json({ ok: false, error: "too_many" }, tooMany(LIMITS.discount.seconds));

  let body: { code?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }
  if (typeof body.code !== "string") return NextResponse.json({ ok: false, error: "invalid" });

  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ ok: false, error: "unavailable" }, { status: 503 });

  const live = await findLiveCode(supabase, body.code);
  if (!live) return NextResponse.json({ ok: false, error: "invalid" });
  return NextResponse.json({ ok: true, code: live.code, percent: live.percent });
}
