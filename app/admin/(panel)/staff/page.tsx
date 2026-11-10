import { redirect } from "next/navigation";
import StaffView from "@/components/admin/staff/StaffView";
import SectionDenied from "@/components/admin/SectionDenied";
import { getSession } from "@/lib/admin/session";
import { getAdminLang, getAdminT } from "@/lib/admin/i18n";
import { canOpen } from "@/lib/admin/sections";
import { getStaffPage } from "@/lib/admin/staff";
import { orderTime } from "@/lib/admin/format";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const session = await getSession();
  if (session.state !== "staff") redirect("/admin/sign-in");
  if (!canOpen(session.staff.role, "staff")) return <SectionDenied role={session.staff.role} section="staff" />;
  const [{ staff, failed }, t, lang] = [await getStaffPage(), await getAdminT(), await getAdminLang()];
  const signIns = Object.fromEntries(staff.filter((s) => s.lastSignIn).map((s) => [s.id, orderTime(lang, s.lastSignIn!)]));
  return (
    <>
      {failed && (
        <p role="alert" className="mb-4 rounded-xl border border-rani/30 bg-[#FBE7EE] px-3 py-2.5 text-[14px] text-rani">
          {t("dashboard.loadFailed")}
        </p>
      )}
      <StaffView staff={staff} me={session.staff.id} signIns={signIns} />
    </>
  );
}
