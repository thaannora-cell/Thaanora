import { notFound, redirect } from "next/navigation";
import PageHead from "@/components/admin/PageHead";
import { getSession } from "@/lib/admin/session";
import { getAdminT } from "@/lib/admin/i18n";
import { canOpen, isSection } from "@/lib/admin/sections";

// Placeholder for each section until it's built. The role check runs on the server for every section,
// so typing the address of a section outside your role shows "Not part of your role", not the page.
export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!isSection(section) || section === "dashboard") notFound();
  const session = await getSession();
  if (session.state !== "staff") redirect("/admin/sign-in");
  const t = await getAdminT();
  const { role } = session.staff;

  if (!canOpen(role, section)) {
    return (
      <div role="alert" className="max-w-[560px] rounded-[18px] border border-rani/30 bg-white p-6">
        <h1 className="m-0 mb-2 font-[family-name:var(--font-cormorant)] text-[28px] font-semibold text-emerald">{t("noAccess.sectionTitle")}</h1>
        <p className="m-0 text-[15px] text-muted">{t("noAccess.sectionText", { role: t(`roles.${role}`), section: t(`nav.${section}`) })}</p>
      </div>
    );
  }

  return (
    <>
      <PageHead title={t(`nav.${section}`)} />
      <div className="max-w-[640px] rounded-[18px] border border-[#E1E6DF] bg-white p-6 shadow-[0_6px_18px_rgba(14,59,46,0.05)]">
        <h2 className="m-0 mb-1 text-[16px] font-semibold text-emerald">{t("section.soonTitle")}</h2>
        <p className="m-0 text-[15px] text-muted">{t("section.soonText")}</p>
      </div>
    </>
  );
}
