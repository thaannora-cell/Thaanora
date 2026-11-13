import { redirect } from "next/navigation";
import SectionDenied from "@/components/admin/SectionDenied";
import OutreachForm from "@/components/admin/outreach/OutreachForm";
import { getSession } from "@/lib/admin/session";
import { getAdminLang, getAdminT } from "@/lib/admin/i18n";
import { canOpen } from "@/lib/admin/sections";
import { orderTime } from "@/lib/admin/format";
import { favouriteBrands, isSegment, listOutreach } from "@/lib/admin/outreach";
import { getSessionClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const panel = "min-w-0 rounded-[18px] border border-[#E1E6DF] bg-white p-[18px] shadow-[0_6px_18px_rgba(14,59,46,0.05)]";

type SP = { kind?: string; segment?: string; value?: string };

// Announcements and personal offers to a group of customers (owner), and what was sent before.
export default async function OutreachPage({ searchParams }: { searchParams: Promise<SP> }) {
  const session = await getSession();
  if (session.state !== "staff") redirect("/admin/sign-in");
  if (!canOpen(session.staff.role, "outreach")) return <SectionDenied role={session.staff.role} section="outreach" />;
  const sp = await searchParams;
  const segment = isSegment(sp.segment) ? sp.segment : "all";
  const value = segment === "customer" && sp.value && /^[0-9a-f-]{36}$/i.test(sp.value) ? sp.value : "";
  let customerName: string | null = null;
  if (value) {
    const { data } = await (await getSessionClient()).from("customers").select("name").eq("id", value).maybeSingle();
    customerName = data?.name ?? null;
  }
  const [t, lang, log, brands] = [await getAdminT(), await getAdminLang(), await listOutreach(), await favouriteBrands()];
  const day = (iso: string) => new Intl.DateTimeFormat(`${lang}-u-ca-gregory`, { day: "numeric", month: "short" }).format(new Date(iso));

  return (
    <>
      <div className="mb-[18px]">
        <h1 className="m-0 font-[family-name:var(--font-cormorant)] text-[28px] font-semibold leading-tight text-emerald md:text-[34px]">{t("outreach.title")}</h1>
        <p className="m-0 text-[14px] text-muted">{t("outreach.sub")}</p>
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">
        <section className={panel} aria-labelledby="compose">
          <h2 id="compose" className="m-0 mb-3 text-[16px] font-semibold text-emerald">
            {t("outreach.composeTitle")}
          </h2>
          <OutreachForm brands={brands} initial={{ kind: sp.kind === "offer" ? "offer" : "announcement", segment, value, customerName }} />
        </section>
        <section className={panel} aria-labelledby="log">
          <h2 id="log" className="m-0 mb-3 text-[16px] font-semibold text-emerald">
            {t("outreach.logTitle")}
          </h2>
          {log.length === 0 ? (
            <p className="m-0 text-[14px] text-muted">{t("outreach.none")}</p>
          ) : (
            <ul className="m-0 flex list-none flex-col p-0">
              {log.map((o) => (
                <li key={o.id} className="border-b border-[#F0EBE1] py-2.5 text-[14px] last:border-b-0">
                  <span className="flex flex-wrap items-center justify-between gap-2">
                    <bdi className="font-medium text-emerald">{o.title}</bdi>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${o.kind === "offer" ? "bg-[#FBEFF3] text-[#7A1238]" : "bg-[#E4F1EA] text-emerald"}`}>
                      {o.kind === "offer" ? t("outreach.offerChip", { pct: o.percent ?? 0 }) : t("outreach.kind.announcement")}
                    </span>
                  </span>
                  <small className="block text-muted">
                    {t(`outreach.segment.${o.segment}`)}
                    {o.segmentValue && o.segment !== "customer" ? ` · ${o.segment === "level" ? t(`outreach.level.${o.segmentValue as "silver"}`) : o.segmentValue}` : ""} · {t("outreach.recipients", { count: o.recipients })} · {orderTime(lang, o.createdAt)}
                  </small>
                  {o.kind === "offer" && (
                    <small className="block text-muted">
                      {t("outreach.used", { used: o.used, count: o.recipients })}
                      {o.endsAt ? ` · ${t("outreach.until", { date: day(o.endsAt) })}` : ""}
                    </small>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
