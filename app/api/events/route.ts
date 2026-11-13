import { NextResponse, type NextRequest } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { getPublicClient } from "@/lib/supabase/public";
import { isSameOrigin } from "@/lib/http";
import { allow } from "@/lib/rate-limit";

// Anonymous trending counts: "a visitor opened this suit" or "added it to the selection".
// Nothing about the person is stored. Same-site only and rate-limited, so the counts can't be pumped.
const done = () => new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return done();
  let body: { code?: unknown; kind?: unknown };
  try {
    body = JSON.parse(await req.text());
  } catch {
    return done();
  }
  const code = typeof body.code === "string" ? body.code.trim().slice(0, 64) : "";
  const kind = body.kind === "add" ? "add" : body.kind === "view" ? "view" : null;
  if (!kind || !/^[\w.-]{1,64}$/.test(code)) return done();
  if (!(await allow(req.headers, "events"))) return done();

  const pub = getPublicClient();
  const db = getAdminClient();
  if (!pub || !db) return done();
  const { data: p } = await pub.from("products").select("id").eq("code", code).maybeSingle();
  if (p) await db.from("product_events").insert({ product_id: p.id, kind });
  return done();
}
