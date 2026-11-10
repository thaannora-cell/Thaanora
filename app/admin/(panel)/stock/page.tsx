import { redirect } from "next/navigation";
import StockView from "@/components/admin/stock/StockView";
import StockHistory from "@/components/admin/stock/StockHistory";
import SectionDenied from "@/components/admin/SectionDenied";
import { getSession } from "@/lib/admin/session";
import { getAdminLang, getAdminT } from "@/lib/admin/i18n";
import { canOpen } from "@/lib/admin/sections";
import { getStockPage } from "@/lib/admin/stock";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function StockPage({ searchParams }: { searchParams: Promise<{ suit?: string }> }) {
  const session = await getSession();
  if (session.state !== "staff") redirect("/admin/sign-in");
  if (!canOpen(session.staff.role, "stock")) return <SectionDenied role={session.staff.role} section="stock" />;

  const { suit: raw } = await searchParams;
  const suit = raw && UUID.test(raw) ? raw : "";
  const [data, lang, t] = [await getStockPage(suit || undefined), await getAdminLang(), await getAdminT()];

  return (
    <>
      {data.failed && (
        <p role="alert" className="mb-4 rounded-xl border border-rani/30 bg-[#FBE7EE] px-3 py-2.5 text-[14px] text-rani">
          {t("dashboard.loadFailed")}
        </p>
      )}
      <StockView products={data.products} lowLevel={data.lowLevel} />
      <StockHistory history={data.history} products={data.products} suit={suit} lang={lang} />
    </>
  );
}
