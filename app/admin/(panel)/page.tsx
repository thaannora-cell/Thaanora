import Link from "next/link";
import { redirect } from "next/navigation";
import AdminIcon from "@/components/admin/AdminIcon";
import PageHead from "@/components/admin/PageHead";
import { getSession } from "@/lib/admin/session";
import { getAdminT } from "@/lib/admin/i18n";
import { sectionHref, sectionsFor } from "@/lib/admin/sections";

export default async function Dashboard() {
  const session = await getSession();
  if (session.state !== "staff") redirect("/admin/sign-in");
  const t = await getAdminT();
  const { staff } = session;
  const sections = sectionsFor(staff.role).filter((s) => s.key !== "dashboard");

  return (
    <>
      <PageHead title={t("dashboard.hello", { name: staff.name })} sub={`${t(`roles.${staff.role}`)} · ${t(`roleText.${staff.role}`)}`} />
      <section aria-labelledby="your-sections" className="rounded-[18px] border border-[#E1E6DF] bg-white p-[18px] shadow-[0_6px_18px_rgba(14,59,46,0.05)]">
        <h2 id="your-sections" className="m-0 mb-3 text-[16px] font-semibold text-emerald">
          {t("dashboard.yourSections")} <small className="font-normal text-muted">· {t("dashboard.soon")}</small>
        </h2>
        <ul className="m-0 grid list-none grid-cols-1 gap-2.5 p-0 sm:grid-cols-2 xl:grid-cols-3">
          {sections.map((s) => (
            <li key={s.key}>
              <Link
                href={sectionHref(s.key)}
                className="flex min-h-[56px] items-center gap-3 rounded-[14px] border border-[#E1E6DF] bg-[#FBFCFA] px-4 text-[15px] text-emerald no-underline transition-[border-color,transform] hover:-translate-y-0.5 hover:border-gold motion-reduce:hover:translate-y-0"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#E8F0EB]">
                  <AdminIcon name={s.icon} />
                </span>
                {t(`nav.${s.key}`)}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
