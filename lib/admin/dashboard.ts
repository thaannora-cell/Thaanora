import "server-only";
import { getSessionClient } from "@/lib/supabase/server";
import { LOW_STOCK, salePrice } from "@/lib/product";
import { canOpen, type StaffRole } from "./sections";

export type OrderStatus =
  | "waiting_confirmation"
  | "confirmed"
  | "packed"
  | "with_courier"
  | "delivered_cash_collected"
  | "refused_at_door"
  | "cancelled";

export type LatestOrder = { id: string; orderNo: string; createdAt: string; area: string; total: number; status: OrderStatus };
export type StockItem = { id: string; name: string; brand: string; code: string; stock: number };

export type DashboardData = {
  orders: null | {
    waiting: number;
    withCourier: number;
    cashCollected: number;
    refusedPct: number;
    refused: number;
    latest: LatestOrder[];
    newRequests: number;
    invoices: { orderNo: string; failed: boolean }[]; // delivered orders without a Zoho invoice
    whatsapp: number; // customers' notifications waiting to be sent on WhatsApp
  };
  stock: null | {
    soldOut: StockItem[];
    low: StockItem[];
    lowLevel: number;
    units: number;
    value: number;
  };
  failed: boolean;
};

// Everything the dashboard shows, read as the signed-in person so Row Level Security applies:
// the orders team gets the order figures, the catalogue team gets stock, the owner gets both.
export async function getDashboard(role: StaffRole): Promise<DashboardData> {
  const supabase = await getSessionClient();
  const data: DashboardData = { orders: null, stock: null, failed: false };

  const count = (status: OrderStatus) =>
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", status);

  const jobs: Promise<void>[] = [];

  if (canOpen(role, "orders")) {
    jobs.push(
      (async () => {
        const [waiting, courier, refused, delivered, latest, requests] = await Promise.all([
          count("waiting_confirmation"),
          count("with_courier"),
          count("refused_at_door"),
          supabase.from("orders").select("total_sar").eq("status", "delivered_cash_collected"),
          supabase.from("orders").select("id, order_no, created_at, area, total_sar, status").order("created_at", { ascending: false }).limit(6),
          supabase.from("requests").select("id", { count: "exact", head: true }).eq("status", "new"),
        ]);
        if ([waiting, courier, refused, delivered, latest, requests].some((r) => r.error)) {
          data.failed = true;
          return;
        }
        const deliveredRows = delivered.data ?? [];
        const refusedN = refused.count ?? 0;
        const finished = deliveredRows.length + refusedN;
        data.orders = {
          waiting: waiting.count ?? 0,
          withCourier: courier.count ?? 0,
          cashCollected: deliveredRows.reduce((s, o) => s + Number(o.total_sar), 0),
          refused: refusedN,
          refusedPct: finished ? Math.round((refusedN / finished) * 100) : 0,
          latest: (latest.data ?? []).map((o) => ({
            id: o.id,
            orderNo: o.order_no,
            createdAt: o.created_at,
            area: o.area,
            total: Number(o.total_sar),
            status: o.status as OrderStatus,
          })),
          newRequests: requests.count ?? 0,
          invoices: [],
          whatsapp: 0,
        };
        const wa = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("whatsapp_status", "pending");
        if (!wa.error) data.orders.whatsapp = wa.count ?? 0;
        // Delivered but no invoice in Zoho Books yet (failed or never tried). Read on its own, so the
        // dashboard still works if this query fails.
        const inv = await supabase
          .from("orders")
          .select("order_no, invoice_status")
          .eq("status", "delivered_cash_collected")
          .in("invoice_status", ["none", "failed"])
          .order("status_changed_at", { ascending: false })
          .limit(8);
        if (!inv.error) data.orders.invoices = (inv.data ?? []).map((r) => ({ orderNo: r.order_no, failed: r.invoice_status === "failed" }));
      })(),
    );
  }

  if (canOpen(role, "stock")) {
    jobs.push(
      (async () => {
        const [products, level] = await Promise.all([
          supabase.from("products").select("id, name, brand, code, stock, price_sar, sale_pct, visible").order("sort_order"),
          // Private setting: the owner can read it; the catalogue team falls back to the default.
          supabase.from("settings").select("value").eq("key", "low_stock_level").maybeSingle(),
        ]);
        if (products.error) {
          data.failed = true;
          return;
        }
        const lowLevel = typeof level.data?.value === "number" && level.data.value >= 0 ? level.data.value : LOW_STOCK;
        const rows = products.data ?? [];
        const onSale = rows.filter((p) => p.visible);
        const item = (p: (typeof rows)[number]): StockItem => ({ id: p.id, name: p.name, brand: p.brand, code: p.code, stock: p.stock });
        data.stock = {
          soldOut: onSale.filter((p) => p.stock <= 0).map(item),
          low: onSale.filter((p) => p.stock > 0 && p.stock <= lowLevel).sort((a, b) => a.stock - b.stock).map(item),
          lowLevel,
          units: onSale.reduce((s, p) => s + Math.max(0, p.stock), 0),
          // Shelf value at today's selling price (after any sale %), VAT-inclusive.
          value: onSale.reduce((s, p) => s + Math.max(0, p.stock) * salePrice({ price_sar: Number(p.price_sar), sale_pct: p.sale_pct }), 0),
        };
      })(),
    );
  }

  await Promise.all(jobs);
  return data;
}
