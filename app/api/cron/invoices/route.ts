import { NextResponse } from "next/server";
import { issueInvoice, ordersNeedingInvoice } from "@/lib/invoices";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Daily retry for delivered orders whose invoice couldn't be created (vercel.json → crons).
// Vercel sends "Authorization: Bearer <CRON_SECRET>"; anyone else gets 401.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const ids = await ordersNeedingInvoice(10);
  const results: Record<string, number> = {};
  for (const id of ids) {
    const r = await issueInvoice(id);
    results[r] = (results[r] ?? 0) + 1;
  }
  return NextResponse.json({ tried: ids.length, results }, { headers: { "Cache-Control": "no-store" } });
}
