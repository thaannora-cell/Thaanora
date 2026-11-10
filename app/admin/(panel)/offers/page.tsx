import { redirect } from "next/navigation";
import OffersView from "@/components/admin/offers/OffersView";
import SectionDenied from "@/components/admin/SectionDenied";
import { getSession } from "@/lib/admin/session";
import { getAdminT } from "@/lib/admin/i18n";
import { canOpen } from "@/lib/admin/sections";
import { getOffersPage, todayInRiyadh } from "@/lib/admin/offers";

export const dynamic = "force-dynamic";

export default async function OffersPage() {
  const session = await getSession();
  if (session.state !== "staff") redirect("/admin/sign-in");
  if (!canOpen(session.staff.role, "offers")) return <SectionDenied role={session.staff.role} section="offers" />;
  const [data, t] = [await getOffersPage(), await getAdminT()];
  return (
    <>
      {data.failed && (
        <p role="alert" className="mb-4 rounded-xl border border-rani/30 bg-[#FBE7EE] px-3 py-2.5 text-[14px] text-rani">
          {t("dashboard.loadFailed")}
        </p>
      )}
      <OffersView bundle={data.bundle} codes={data.codes} brands={data.brands} today={todayInRiyadh()} />
    </>
  );
}
