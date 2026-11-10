import { redirect } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import NoAccess from "@/components/admin/NoAccess";
import { getSession } from "@/lib/admin/session";
import { getAdminLang, getAdminT } from "@/lib/admin/i18n";
import { sectionsFor } from "@/lib/admin/sections";

// Every back-office page sits inside this check: signed in, and on the active staff list.
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (session.state === "signed-out") redirect("/admin/sign-in");
  if (session.state === "no-access") return <NoAccess email={session.email} />;

  const [t, lang] = [await getAdminT(), await getAdminLang()];
  const { staff } = session;
  return (
    <AdminShell
      name={staff.name}
      roleLabel={t(`roles.${staff.role}`)}
      lang={lang}
      sections={sectionsFor(staff.role).map(({ key, icon }) => ({ key, icon }))}
    >
      {children}
    </AdminShell>
  );
}
