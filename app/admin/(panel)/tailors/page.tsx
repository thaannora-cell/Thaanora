import { redirect } from "next/navigation";
import TailorsView from "@/components/admin/tailors/TailorsView";
import SectionDenied from "@/components/admin/SectionDenied";
import { getSession } from "@/lib/admin/session";
import { getAdminT } from "@/lib/admin/i18n";
import { canOpen } from "@/lib/admin/sections";
import { getTailorsPage } from "@/lib/admin/tailors";

export const dynamic = "force-dynamic";

export default async function TailorsPage() {
  const session = await getSession();
  if (session.state !== "staff") redirect("/admin/sign-in");
  if (!canOpen(session.staff.role, "tailors")) return <SectionDenied role={session.staff.role} section="tailors" />;
  const [data, t] = [await getTailorsPage(), await getAdminT()];
  return (
    <>
      {data.failed && (
        <p role="alert" className="mb-4 rounded-xl border border-rani/30 bg-[#FBE7EE] px-3 py-2.5 text-[14px] text-rani">
          {t("tailors.needsMigration")}
        </p>
      )}
      <TailorsView tailors={data.tailors} defaultPct={data.defaultPct} areas={data.areas} />
    </>
  );
}
