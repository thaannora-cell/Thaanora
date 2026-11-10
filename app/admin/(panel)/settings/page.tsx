import { redirect } from "next/navigation";
import SettingsView from "@/components/admin/settings/SettingsView";
import SectionDenied from "@/components/admin/SectionDenied";
import { getSession } from "@/lib/admin/session";
import { getAdminT } from "@/lib/admin/i18n";
import { canOpen } from "@/lib/admin/sections";
import { getSettingsForm } from "@/lib/admin/settings";
import { allDefaults, getSavedTemplates } from "@/lib/admin/wa-templates";
import TemplatesView from "@/components/admin/settings/TemplatesView";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getSession();
  if (session.state !== "staff") redirect("/admin/sign-in");
  if (!canOpen(session.staff.role, "settings")) return <SectionDenied role={session.staff.role} section="settings" />;
  const [{ form, failed }, t, saved, defaults] = await Promise.all([getSettingsForm(), getAdminT(), getSavedTemplates(), allDefaults()]);
  return (
    <>
      {failed && (
        <p role="alert" className="mb-4 rounded-xl border border-rani/30 bg-[#FBE7EE] px-3 py-2.5 text-[14px] text-rani">
          {t("dashboard.loadFailed")}
        </p>
      )}
      <SettingsView form={form} />
      <TemplatesView saved={saved} defaults={defaults} />
    </>
  );
}
