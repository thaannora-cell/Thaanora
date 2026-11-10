import Link from "next/link";
import { redirect } from "next/navigation";
import SectionDenied from "@/components/admin/SectionDenied";
import ReqStatusChip from "@/components/admin/requests/ReqStatusChip";
import { getSession } from "@/lib/admin/session";
import { getAdminLang, getAdminT } from "@/lib/admin/i18n";
import { canOpen } from "@/lib/admin/sections";
import { REQUEST_STATUSES, REQUEST_TYPES, isReqStatus, isType, listRequests } from "@/lib/admin/requests";
import { orderTime } from "@/lib/admin/format";

export const dynamic = "force-dynamic";

const chipLink =
  "inline-flex min-h-[36px] items-center whitespace-nowrap rounded-full border border-[#DDD3C0] bg-white px-3 text-[13px] text-emerald no-underline aria-[current=page]:border-emerald aria-[current=page]:bg-emerald aria-[current=page]:text-white";
const td = "border-b border-[#F0EBE1] px-2 py-2.5 align-top";

export default async function RequestsPage({ searchParams }: { searchParams: Promise<{ type?: string; status?: string }> }) {
  const session = await getSession();
  if (session.state !== "staff") redirect("/admin/sign-in");
  if (!canOpen(session.staff.role, "requests")) return <SectionDenied role={session.staff.role} section="requests" />;
  const sp = await searchParams;
  const type = sp.type && isType(sp.type) ? sp.type : null;
  const status = sp.status && isReqStatus(sp.status) ? sp.status : null;
  const [data, t, lang] = [await listRequests(type, status), await getAdminT(), await getAdminLang()];
  const href = (k: "type" | "status", v: string | null) => {
    const p = new URLSearchParams();
    const next = { type, status, [k]: v };
    if (next.type) p.set("type", next.type);
    if (next.status) p.set("status", next.status);
    const qs = p.toString();
    return `/admin/requests${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <div className="mb-[18px]">
        <h1 className="m-0 font-[family-name:var(--font-cormorant)] text-[28px] font-semibold leading-tight text-emerald md:text-[34px]">{t("requests.title")}</h1>
        <p className="m-0 text-[14px] text-muted">{t("requests.sub")}</p>
      </div>

      <nav aria-label={t("requests.byType")} className="-mx-4 mb-2 overflow-x-auto px-4 md:mx-0 md:px-0">
        <ul className="m-0 flex list-none gap-1.5 p-0 md:flex-wrap">
          <li>
            <Link href={href("type", null)} aria-current={!type ? "page" : undefined} className={chipLink}>
              {t("requests.allTypes")} ({data.total})
            </Link>
          </li>
          {REQUEST_TYPES.map((x) => (
            <li key={x}>
              <Link href={href("type", x)} aria-current={type === x ? "page" : undefined} className={chipLink}>
                {t(`requests.type.${x}`)} ({data.byType[x]})
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <nav aria-label={t("requests.byStatus")} className="-mx-4 mb-3 overflow-x-auto px-4 md:mx-0 md:px-0">
        <ul className="m-0 flex list-none gap-1.5 p-0 md:flex-wrap">
          <li>
            <Link href={href("status", null)} aria-current={!status ? "page" : undefined} className={chipLink}>
              {t("requests.allStatuses")}
            </Link>
          </li>
          {REQUEST_STATUSES.map((x) => (
            <li key={x}>
              <Link href={href("status", x)} aria-current={status === x ? "page" : undefined} className={chipLink}>
                {t(`requests.status.${x}`)} ({data.byStatus[x]})
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {data.failed && (
        <p role="alert" className="mb-4 rounded-xl border border-rani/30 bg-[#FBE7EE] px-3 py-2.5 text-[14px] text-rani">
          {t("dashboard.loadFailed")}
        </p>
      )}

      <section className="min-w-0 rounded-[18px] border border-[#E1E6DF] bg-white p-3 shadow-[0_6px_18px_rgba(14,59,46,0.05)] md:p-[18px]">
        {data.requests.length === 0 ? (
          <p className="m-0 p-2 text-[14px] text-muted">{type || status ? t("requests.noMatch") : t("requests.none")}</p>
        ) : (
          <>
            <ul className="m-0 flex list-none flex-col p-0 lg:hidden">
              {data.requests.map((r) => (
                <li key={r.id} className="border-b border-[#F0EBE1] last:border-b-0">
                  <Link href={`/admin/requests/${r.id}`} className="flex items-start justify-between gap-3 py-3 text-[14px] text-ink no-underline">
                    <span className="min-w-0">
                      <b className="block font-medium text-emerald">{t(`requests.type.${r.type}`)}</b>
                      <bdi className="block truncate">{r.what}</bdi>
                      <small className="block text-muted">
                        <bdi>{r.customer}</bdi> · {orderTime(lang, r.createdAt)}
                      </small>
                    </span>
                    <ReqStatusChip status={r.status} label={t(`requests.status.${r.status}`)} />
                  </Link>
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full border-collapse text-[14px]">
                <thead>
                  <tr>
                    {(["colRef", "colType", "colRequest", "colCustomer", "colDate", "colStatus"] as const).map((c) => (
                      <th key={c} className="th-caps whitespace-nowrap border-b border-[#E7E1D4] px-2 py-2 text-start text-[11px] font-semibold uppercase tracking-[0.1em] text-gold-ink">
                        {t(`requests.${c}`)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.requests.map((r) => (
                    <tr key={r.id} className="hover:bg-[#FAF8F3]">
                      <td className={td}>
                        <Link href={`/admin/requests/${r.id}`} className="font-medium text-emerald hover:underline" dir="ltr">
                          {r.ref}
                        </Link>
                      </td>
                      <td className={td}>{t(`requests.type.${r.type}`)}</td>
                      <td className={`${td} max-w-[320px]`}>
                        <bdi>{r.what}</bdi>
                        {r.quantity && r.quantity > 1 && <small className="text-muted"> × {r.quantity}</small>}
                        {r.hasScreenshot && <small className="block text-muted">{t("requests.withScreenshot")}</small>}
                      </td>
                      <td className={td}>
                        <bdi>{r.customer}</bdi>
                      </td>
                      <td className={`${td} whitespace-nowrap tabular-nums`}>{orderTime(lang, r.createdAt)}</td>
                      <td className={td}>
                        <ReqStatusChip status={r.status} label={t(`requests.status.${r.status}`)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </>
  );
}
