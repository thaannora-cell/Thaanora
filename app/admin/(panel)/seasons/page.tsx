import { redirect } from "next/navigation";
import SeasonsView from "@/components/admin/offers/SeasonsView";
import SectionDenied from "@/components/admin/SectionDenied";
import { getSession } from "@/lib/admin/session";
import { getAdminT } from "@/lib/admin/i18n";
import { canOpen } from "@/lib/admin/sections";
import { getSeasonsPage, todayInRiyadh } from "@/lib/admin/offers";

export const dynamic = "force-dynamic";

export default async function SeasonsPage() {
  const session = await getSession();
  if (session.state !== "staff") redirect("/admin/sign-in");
  if (!canOpen(session.staff.role, "seasons")) return <SectionDenied role={session.staff.role} section="seasons" />;
  const [data, t] = [await getSeasonsPage(), await getAdminT()];
  return (
    <>
      {data.failed && (
        <p role="alert" className="mb-4 rounded-xl border border-rani/30 bg-[#FBE7EE] px-3 py-2.5 text-[14px] text-rani">
          {t("seasons.needsMigration")}
        </p>
      )}
      <SeasonsView campaigns={data.campaigns} brandOfMonth={data.brandOfMonth} brands={data.brands} messages={data.messages} today={todayInRiyadh()} />
    </>
  );
}
