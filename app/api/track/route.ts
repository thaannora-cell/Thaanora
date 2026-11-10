import { NextResponse, type NextRequest } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { isSameOrigin } from "@/lib/http";
import { allow, LIMITS, tooMany } from "@/lib/rate-limit";
import { normaliseSaudiMobile } from "@/lib/phone";

// "1024", "th1024", "TH-1024" → "TH-1024"
function normaliseOrderNo(input: string): string | null {
  const m = input.trim().match(/^(?:th)?[\s-]*(\d{3,7})$/i);
  return m ? `TH-${m[1]}` : null;
}

// The same answer for an unknown number and a wrong phone, so nobody can probe for orders.
const notFound = () => NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  // At most 20 lookups per 10 minutes: order numbers + phone numbers can't be guessed by trying many.
  if (!(await allow(req.headers, "track"))) return NextResponse.json({ ok: false, error: "too_many" }, tooMany(LIMITS.track.seconds));

  let body: { orderNo?: unknown; phone?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }
  const orderNo = typeof body.orderNo === "string" ? normaliseOrderNo(body.orderNo) : null;
  const phone = typeof body.phone === "string" ? normaliseSaudiMobile(body.phone) : null;
  if (!orderNo || !phone) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });

  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ ok: false, error: "unavailable" }, { status: 503 });

  // Only these columns ever leave the server: no names, phone numbers, addresses or gift details.
  const { data: order } = await supabase
    .from("orders")
    .select("id, order_no, status, created_at, status_changed_at, total_sar, courier, tracking_no")
    .eq("order_no", orderNo)
    .eq("customer_phone", phone)
    .maybeSingle();
  if (!order) return notFound();

  const { data: items } = await supabase.from("order_items").select("qty").eq("order_id", order.id);
  const suits = (items ?? []).reduce((n, i) => n + i.qty, 0);

  return NextResponse.json({
    ok: true,
    order: {
      orderNo: order.order_no,
      status: order.status,
      placedAt: order.created_at,
      updatedAt: order.status_changed_at,
      total: Number(order.total_sar),
      suits,
      courier: order.status === "with_courier" || order.status === "delivered_cash_collected" ? order.courier : null,
      trackingNo: order.status === "with_courier" || order.status === "delivered_cash_collected" ? order.tracking_no : null,
    },
  });
}
