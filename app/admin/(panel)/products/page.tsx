import { redirect } from "next/navigation";
import ProductsView from "@/components/admin/products/ProductsView";
import SectionDenied from "@/components/admin/SectionDenied";
import { getSession } from "@/lib/admin/session";
import { getAdminLang, getAdminT } from "@/lib/admin/i18n";
import { canOpen } from "@/lib/admin/sections";
import { getProductsPage } from "@/lib/admin/products";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const session = await getSession();
  if (session.state !== "staff") redirect("/admin/sign-in");
  if (!canOpen(session.staff.role, "products")) return <SectionDenied role={session.staff.role} section="products" />;

  const [data, lang, t] = [await getProductsPage(), await getAdminLang(), await getAdminT()];
  return (
    <>
      {data.failed && (
        <p role="alert" className="mb-4 rounded-xl border border-rani/30 bg-[#FBE7EE] px-3 py-2.5 text-[14px] text-rani">
          {t("dashboard.loadFailed")}
        </p>
      )}
      <ProductsView products={data.products} rate={data.rate} lowLevel={data.lowLevel} brandOfMonth={data.brandOfMonth} lang={lang} />
    </>
  );
}
