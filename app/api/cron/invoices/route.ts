import { NextResponse } from "next/server";
import { issueInvoice, ordersNeedingInvoice } from "@/lib/invoices";
import { getAdminClient } from "@/lib/supabase/admin";

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
  // Also daily: anonymous trending counts are kept for 30 days only.
  const db = getAdminClient();
  if (db) await db.from("product_events").delete().lt("created_at", new Date(Date.now() - 30 * 86400000).toISOString());
  // And: birthday gift notices for customers whose gift window opens today (7 days before).
  const birthdays = db ? await db.rpc("birthday_gift_notices") : null;
  return NextResponse.json({ tried: ids.length, results, birthdayNotices: birthdays?.data ?? null }, { headers: { "Cache-Control": "no-store" } });
}
