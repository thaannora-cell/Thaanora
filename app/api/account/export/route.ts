import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getAccount } from "@/lib/customer/account";
import { getAdminClient } from "@/lib/supabase/admin";
import { allow, LIMITS, tooMany } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// "Download my data" (PDPL): everything Thaanora keeps about the signed-in customer, as one JSON file.
// Only her own rows, read with the secret key after checking her session. Never staff notes or costs.
export async function GET() {
  const account = await getAccount();
  if (account.state !== "customer") return NextResponse.json({ error: "signedOut" }, { status: 401 });
  if (!(await allow(await headers(), "exportData"))) return NextResponse.json({ error: "too_many" }, tooMany(LIMITS.exportData.seconds));
  const db = getAdminClient();
  if (!db) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  const id = account.customer.id;

  const [profile, addresses, favourites, orders, requests, returns, reviews, notifications, prefs, offers] = await Promise.all([
    db.from("customers").select("name, phone, email, language, birthday, measurements, tailor_id, status, created_at, updated_at").eq("id", id).maybeSingle(),
    db.from("addresses").select("label, recipient_name, recipient_phone, area, district, details, lat, lng, is_default, is_gift, created_at").eq("customer_id", id),
    db.from("favorites").select("created_at, products (code, name, brand)").eq("customer_id", id),
    db
      .from("orders")
      .select(
        "order_no, status, created_at, status_changed_at, customer_name, customer_phone, area, address, packaging, is_gift, gift_note, recipient_name, recipient_area, discount_code, discount_kind, subtotal_sar, bundle_discount_sar, code_discount_sar, perk_discount_sar, packaging_fee_sar, delivery_fee_sar, total_sar, vat_sar, invoice_no, order_items (product_code, product_name, unit_price_sar, qty, wants_stitching)",
      )
      .eq("customer_id", id)
      .order("created_at"),
    db.from("requests").select("type, status, customer_name, customer_phone, area, details, brand, reference, quantity, created_at").eq("customer_id", id),
    db.from("returns").select("return_no, status, resolution, reason, details, refund_sar, created_at, return_items (qty, order_items (product_code, product_name))").eq("customer_id", id),
    db.from("reviews").select("rating, body, status, reply, created_at, products (code, name)").eq("customer_id", id),
    db.from("notifications").select("type, data, read_at, created_at").eq("customer_id", id).order("created_at"),
    db.from("notification_prefs").select("type, channel").eq("customer_id", id),
    db.from("customer_offers").select("percent, title, starts_at, ends_at, active, created_at").eq("customer_id", id),
  ]);

  const body = {
    exportedAt: new Date().toISOString(),
    seller: "Desert Bloom Poultry Company (Thaanora)",
    signInEmail: account.customer.email,
    profile: profile.data,
    addresses: addresses.data ?? [],
    favourites: favourites.data ?? [],
    orders: orders.data ?? [],
    requests: requests.data ?? [],
    returns: returns.data ?? [],
    reviews: reviews.data ?? [],
    notifications: notifications.data ?? [],
    notificationSettings: prefs.data ?? [],
    personalOffers: offers.data ?? [],
  };
  const day = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="thaanora-my-data-${day}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
