import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/admin/session";
import { canOpen } from "@/lib/admin/sections";
import { loadOrders, readRange, toLines } from "@/lib/admin/reports";

// Spreadsheet of every order line in the range (owner only). No customer names or phone numbers.
// Cells that a spreadsheet would treat as a formula (=, +, -, @) are made plain text.
const cell = (v: string | number) => {
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (session.state !== "staff" || !canOpen(session.staff.role, "reports")) {
    return new NextResponse("Not allowed", { status: 403, headers: { "Cache-Control": "no-store" } });
  }
  const range = readRange(req.nextUrl.searchParams.get("from") ?? undefined, req.nextUrl.searchParams.get("to") ?? undefined);
  const { orders, brandOf, failed } = await loadOrders(range);
  if (failed) return new NextResponse("Could not load orders", { status: 500 });

  const header = ["order_no", "date_riyadh", "status", "area", "brand", "product_code", "product_name", "qty", "unit_price_sar", "line_total_sar", "order_discounts_sar", "order_delivery_sar", "order_total_sar"];
  const rows = toLines(orders, brandOf).map((l) =>
    [l.orderNo, l.day, l.status, l.area, l.brand, l.code, l.name, l.qty, l.unit, l.unit * l.qty, l.discount, l.delivery, l.total].map(cell).join(","),
  );
  // The byte-order mark makes Excel read Arabic and Urdu names correctly.
  const body = "﻿" + [header.join(","), ...rows].join("\r\n") + "\r\n";
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="thaanora-orders-${range.from}-to-${range.to}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
