import { NextResponse } from "next/server";
import { getSession } from "@/lib/admin/session";
import { canOpen } from "@/lib/admin/sections";
import { getSessionClient } from "@/lib/supabase/server";
import { zohoConfig, zohoInvoicePdf } from "@/lib/zoho/books";

export const dynamic = "force-dynamic";

// "View invoice": the PDF straight from Zoho Books, for signed-in owner / orders team only.
// The browser never talks to Zoho and never sees a key.
export async function GET(_req: Request, { params }: { params: Promise<{ orderNo: string }> }) {
  const session = await getSession();
  if (session.state !== "staff" || !canOpen(session.staff.role, "orders")) return new NextResponse("Not allowed", { status: 403 });
  const { orderNo } = await params;
  if (!/^TH-\d{3,7}$/.test(orderNo)) return new NextResponse("Not found", { status: 404 });

  const supabase = await getSessionClient();
  const { data: o } = await supabase.from("orders").select("invoice_zoho_id, invoice_no").eq("order_no", orderNo).maybeSingle();
  const c = zohoConfig();
  if (!o?.invoice_zoho_id || !c) return new NextResponse("No invoice yet", { status: 404 });

  try {
    const pdf = await zohoInvoicePdf(c, o.invoice_zoho_id);
    const name = `${(o.invoice_no ?? orderNo).replace(/[^\w-]/g, "")}.pdf`;
    return new NextResponse(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${name}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    console.error(`[invoice pdf] ${orderNo}: ${(err as Error).message}`);
    return new NextResponse("Couldn't load the invoice from Zoho Books. Please try again.", { status: 502 });
  }
}
