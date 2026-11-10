import { getAdminT } from "@/lib/admin/i18n";
import type { SectionKey, StaffRole } from "@/lib/admin/sections";

// Shown when someone opens the address of a section outside their role.
export default async function SectionDenied({ role, section }: { role: StaffRole; section: SectionKey }) {
  const t = await getAdminT();
  return (
    <div role="alert" className="max-w-[560px] rounded-[18px] border border-rani/30 bg-white p-6">
      <h1 className="m-0 mb-2 font-[family-name:var(--font-cormorant)] text-[28px] font-semibold text-emerald">{t("noAccess.sectionTitle")}</h1>
      <p className="m-0 text-[15px] text-muted">{t("noAccess.sectionText", { role: t(`roles.${role}`), section: t(`nav.${section}`) })}</p>
    </div>
  );
}
