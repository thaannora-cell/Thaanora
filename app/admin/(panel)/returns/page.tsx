import Link from "next/link";
import { redirect } from "next/navigation";
import SectionDenied from "@/components/admin/SectionDenied";
import { getSession } from "@/lib/admin/session";
import { getAdminLang, getAdminT } from "@/lib/admin/i18n";
import { canOpen } from "@/lib/admin/sections";
import { orderTime } from "@/lib/admin/format";
import { isReturnStatus, listReturns } from "@/lib/admin/returns";
import { RETURN_STATUSES } from "@/lib/returns";
import { RETURN_TONE } from "@/components/admin/returns/tone";

export const dynamic = "force-dynamic";

const chipLink =
  "inline-flex min-h-[36px] items-center whitespace-nowrap rounded-full border border-[#DDD3C0] bg-white px-3 text-[13px] text-emerald no-underline aria-[current=page]:border-emerald aria-[current=page]:bg-emerald aria-[current=page]:text-white";

// Customers' return requests, newest first, filtered by status.
export default async function ReturnsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const session = await getSession();
  if (session.state !== "staff") redirect("/admin/sign-in");
  if (!canOpen(session.staff.role, "returns")) return <SectionDenied role={session.staff.role} section="returns" />;
  const sp = await searchParams;
  const status = isReturnStatus(sp.status) ? sp.status : null;
  const [data, t, lang] = [await listReturns(status), await getAdminT(), await getAdminLang()];
  const total = Object.values(data.counts).reduce((a, b) => a + b, 0);
  const sar = (n: number) => t("money", { amount: n });

  return (
    <>
      <div className="mb-[18px]">
        <h1 className="m-0 font-[family-name:var(--font-cormorant)] text-[28px] font-semibold leading-tight text-emerald md:text-[34px]">{t("returns.title")}</h1>
        <p className="m-0 text-[14px] text-muted">{t("returns.sub")}</p>
      </div>
      <nav aria-label={t("returns.byStatus")} className="-mx-4 mb-3 overflow-x-auto px-4 md:mx-0 md:px-0">
        <ul className="m-0 flex list-none gap-1.5 p-0 md:flex-wrap">
          <li>
            <Link href="/admin/returns" aria-current={!status ? "page" : undefined} className={chipLink}>
              {t("returns.all")} ({total})
            </Link>
          </li>
          {RETURN_STATUSES.map((s) => (
            <li key={s}>
              <Link href={`/admin/returns?status=${s}`} aria-current={status === s ? "page" : undefined} className={chipLink}>
                {t(`returns.status.${s}`)} ({data.counts[s]})
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
        {data.rows.length === 0 ? (
          <p className="m-0 p-2 text-[14px] text-muted">{t("returns.none")}</p>
        ) : (
          <ul className="m-0 flex list-none flex-col p-0">
            {data.rows.map((r) => (
              <li key={r.id} className="border-b border-[#F0EBE1] last:border-b-0">
                <Link href={`/admin/returns/${r.id}`} className="flex flex-wrap items-start justify-between gap-3 py-3 text-[14px] text-ink no-underline hover:bg-[#FAF8F3]">
                  <span className="min-w-0">
                    <b className="font-medium text-emerald" dir="ltr">
                      {r.returnNo}
                    </b>{" "}
                    · <span dir="ltr">{r.orderNo}</span> · <bdi>{r.customer}</bdi>
                    <small className="block text-muted">
                      {t(`returns.reason.${r.reason}`)} · {t(`returns.resolution.${r.resolution}`)} · {sar(r.refund)} · {orderTime(lang, r.createdAt)}
                    </small>
                    {r.zohoProblem && <small className="block text-rani">{t("returns.zohoAttention")}</small>}
                  </span>
                  <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-medium ${RETURN_TONE[r.status]}`}>{t(`returns.status.${r.status}`)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
