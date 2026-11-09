import { NextResponse, type NextRequest } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { isSameOrigin } from "@/lib/http";

// Checks one code at a time; the list of codes is never sent to the browser.
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

  let body: { code?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }

  const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
  if (!/^[A-Z0-9_-]{2,32}$/.test(code)) return NextResponse.json({ ok: false, error: "invalid" });

  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ ok: false, error: "unavailable" }, { status: 503 });

  const { data } = await supabase
    .from("offers")
    .select("code, percent, starts_at, ends_at, usage_limit, used_count")
    .eq("kind", "code")
    .eq("active", true)
    .eq("code", code)
    .maybeSingle();

  const now = Date.now();
  const live =
    data &&
    (!data.starts_at || Date.parse(data.starts_at) <= now) &&
    (!data.ends_at || Date.parse(data.ends_at) > now) &&
    (data.usage_limit == null || data.used_count < data.usage_limit);

  if (!live) return NextResponse.json({ ok: false, error: "invalid" });
  return NextResponse.json({ ok: true, code: data.code, percent: data.percent });
}
