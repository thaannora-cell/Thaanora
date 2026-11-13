import { redirect } from "next/navigation";
import SectionDenied from "@/components/admin/SectionDenied";
import Kpi from "@/components/admin/Kpi";
import { getSession } from "@/lib/admin/session";
import { getAdminLang, getAdminT } from "@/lib/admin/i18n";
import { canOpen } from "@/lib/admin/sections";
import { getCustomerReport, getReport, readRange } from "@/lib/admin/reports";
import { getLevels } from "@/lib/customer/perks";
import Link from "next/link";
import { amount } from "@/lib/admin/format";
import { todayInRiyadh } from "@/lib/admin/offers";

export const dynamic = "force-dynamic";

const panel = "min-w-0 rounded-[18px] border border-[#E1E6DF] bg-white p-[18px] shadow-[0_6px_18px_rgba(14,59,46,0.05)]";
const h2 = "m-0 mb-3 text-[16px] font-semibold text-emerald";
const field = "min-h-[42px] rounded-xl border border-[#DDD3C0] bg-white px-3 text-[15px] text-ink focus:border-gold focus:outline-none";
const th = "th-caps whitespace-nowrap border-b border-[#E7E1D4] px-2 py-2 text-start text-[11px] font-semibold uppercase tracking-[0.1em] text-gold-ink";
const td = "border-b border-[#F0EBE1] px-2 py-2 tabular-nums";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const session = await getSession();
  if (session.state !== "staff") redirect("/admin/sign-in");
  if (!canOpen(session.staff.role, "reports")) return <SectionDenied role={session.staff.role} section="reports" />;
  const sp = await searchParams;
  const range = readRange(sp.from, sp.to);
  const [r, t, lang, levels] = [await getReport(range), await getAdminT(), await getAdminLang(), await getLevels()];
  const cr = await getCustomerReport(range, levels);
  const sar = (n: number) => t("money", { amount: amount(lang, n) });
  const short = (d: string) => new Intl.DateTimeFormat(lang === "ar" ? "ar-SA-u-nu-latn-ca-gregory" : "en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));
  const maxDay = Math.max(1, ...r.byDay.map((d) => d.value));
  const maxBrand = Math.max(1, ...r.byBrand.map((b) => b.value));
  const csv = `/admin/reports/export?from=${r.range.from}&to=${r.range.to}`;
  type CodKey = "collected" | "onTheRoad" | "confirmed" | "waiting" | "refused" | "cancelled";
  const codRow = (key: CodKey, v: { orders: number; value: number }, tone = "") => (
    <tr key={key}>
      <td className={`${td} ${tone}`}>{t(`reports.cod.${key}`)}</td>
      <td className={`${td} text-end`}>{v.orders}</td>
      <td className={`${td} text-end`}>{sar(v.value)}</td>
    </tr>
  );

  return (
    <>
      <div className="mb-[18px] flex flex-wrap items-end gap-3">
        <div className="min-w-0">
          <h1 className="m-0 font-[family-name:var(--font-cormorant)] text-[28px] font-semibold leading-tight text-emerald md:text-[34px]">{t("reports.title")}</h1>
          <p className="m-0 text-[14px] text-muted">{t("reports.sub", { from: short(r.range.from), to: short(r.range.to), days: r.range.days.length })}</p>
        </div>
        <form method="get" className="flex w-full flex-wrap items-end gap-2 sm:ms-auto sm:w-auto">
          <label className="flex flex-col gap-1 text-[12px] text-muted">
            {t("reports.from")}
            <input type="date" name="from" defaultValue={r.range.from} max={todayInRiyadh()} className={field} />
          </label>
          <label className="flex flex-col gap-1 text-[12px] text-muted">
            {t("reports.to")}
            <input type="date" name="to" defaultValue={r.range.to} max={todayInRiyadh()} className={field} />
          </label>
          <button type="submit" className="min-h-[42px] rounded-full border border-emerald bg-emerald px-4 text-[14px] font-medium text-ivory-white">
            {t("reports.show")}
          </button>
          <a href={csv} download className="inline-flex min-h-[42px] items-center rounded-full border border-[#CFC3AA] bg-white px-4 text-[14px] font-medium text-emerald no-underline">
            {t("reports.csv")}
          </a>
        </form>
      </div>

      {r.failed && (
        <p role="alert" className="mb-4 rounded-xl border border-rani/30 bg-[#FBE7EE] px-3 py-2.5 text-[14px] text-rani">
          {t("dashboard.loadFailed")}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        <Kpi icon="rep" value={sar(r.sales.value)} label={t("reports.kSales", { orders: r.sales.orders })} />
        <Kpi icon="prod" value={r.sales.suits} label={t("reports.kSuits")} />
        <Kpi icon="off" value={sar(r.cod.collected.value)} label={t("reports.kCollected")} />
        <Kpi icon="ord" value={r.refusalRate === null ? "—" : `${r.refusalRate}%`} label={t("reports.kRefused", { refused: r.cod.refused.orders })} warn={(r.refusalRate ?? 0) > 0} />
      </div>

      {/* Sales by day */}
      <section aria-labelledby="days" className={`${panel} mt-4`}>
        <h2 id="days" className={h2}>
          {t("reports.byDay")} <small className="font-normal text-muted">· {t("reports.byDayHint")}</small>
        </h2>
        <div className="overflow-x-auto">
          <div className="flex h-[180px] items-end gap-1.5" style={{ minWidth: `${Math.max(r.byDay.length * 22, 280)}px` }} aria-hidden="true">
            {r.byDay.map((d) => (
              <div key={d.day} className="flex h-full min-w-[16px] flex-1 flex-col items-center justify-end gap-1" title={`${short(d.day)} · ${sar(d.value)}`}>
                <i className="block w-full max-w-[40px] rounded-t-md bg-emerald" style={{ height: `${Math.max(d.value ? 3 : 0, (d.value / maxDay) * 100)}%` }} />
              </div>
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[11px] text-muted" style={{ minWidth: `${Math.max(r.byDay.length * 22, 280)}px` }} aria-hidden="true">
            <span>{short(r.range.from)}</span>
            <span>{short(r.range.to)}</span>
          </div>
        </div>
        <details className="mt-2 text-[14px]">
          <summary className="min-h-[36px] cursor-pointer py-1.5 text-emerald underline underline-offset-2">{t("reports.asTable")}</summary>
          <div className="max-h-[320px] overflow-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={th}>{t("reports.day")}</th>
                  <th className={`${th} text-end`}>{t("reports.orders")}</th>
                  <th className={`${th} text-end`}>{t("reports.value")}</th>
                </tr>
              </thead>
              <tbody>
                {r.byDay.map((d) => (
                  <tr key={d.day}>
                    <td className={td}>{short(d.day)}</td>
                    <td className={`${td} text-end`}>{d.orders}</td>
                    <td className={`${td} text-end`}>{sar(d.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </section>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* By brand */}
        <section aria-labelledby="brands" className={panel}>
          <h2 id="brands" className={h2}>
            {t("reports.byBrand")} <small className="font-normal text-muted">· {t("reports.beforeDiscounts")}</small>
          </h2>
          {r.byBrand.length === 0 ? (
            <p className="m-0 text-[14px] text-muted">{t("reports.noSales")}</p>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
              {r.byBrand.map((b) => (
                <li key={b.brand} className="grid grid-cols-[minmax(90px,140px)_1fr_auto] items-center gap-2.5 text-[13px]">
                  <bdi className="truncate">{b.brand}</bdi>
                  <span className="h-3 rounded-full bg-[#F0EBE1]" aria-hidden="true">
                    <span className="block h-3 rounded-full bg-gold" style={{ width: `${(b.value / maxBrand) * 100}%` }} />
                  </span>
                  <span className="text-end tabular-nums text-emerald">
                    {sar(b.value)} <small className="text-muted">· {t("reports.suitsN", { count: b.suits })}</small>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Best sellers */}
        <section aria-labelledby="best" className={panel}>
          <h2 id="best" className={h2}>
            {t("reports.best")}
          </h2>
          {r.best.length === 0 ? (
            <p className="m-0 text-[14px] text-muted">{t("reports.noSales")}</p>
          ) : (
            <ol className="m-0 flex list-none flex-col p-0">
              {r.best.map((b, i) => (
                <li key={b.code} className="flex items-center justify-between gap-3 border-b border-[#F0EBE1] py-2 text-[14px] last:border-b-0">
                  <span className="min-w-0">
                    <b className="me-2 font-[family-name:var(--font-cormorant)] text-[18px] text-gold-ink">{i + 1}</b>
                    <bdi>{b.name}</bdi> <small className="text-muted">· <bdi>{b.brand}</bdi></small>
                  </span>
                  <span className="shrink-0 tabular-nums">
                    {t("reports.suitsN", { count: b.suits })} · {sar(b.value)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      {/* Cash on delivery */}
      <section aria-labelledby="cod" className={`${panel} mt-4`}>
        <h2 id="cod" className={h2}>
          {t("reports.codTitle")} <small className="font-normal text-muted">· {t("reports.codHint", { placed: r.placed })}</small>
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse text-[14px]">
            <thead>
              <tr>
                <th className={th}>{t("reports.stage")}</th>
                <th className={`${th} text-end`}>{t("reports.orders")}</th>
                <th className={`${th} text-end`}>{t("reports.value")}</th>
              </tr>
            </thead>
            <tbody>
              {codRow("collected", r.cod.collected, "font-semibold text-[#1E6B43]")}
              {codRow("onTheRoad", r.cod.onTheRoad)}
              {codRow("confirmed", r.cod.confirmed)}
              {codRow("waiting", r.cod.waiting)}
              {codRow("refused", r.cod.refused, "text-rani")}
              {codRow("cancelled", r.cod.cancelled, "text-muted")}
            </tbody>
          </table>
        </div>
        <p className="m-0 mt-2 text-[12px] text-muted">
          {t("reports.refusalNote", { rate: r.refusalRate === null ? "—" : `${r.refusalRate}%` })} {t("reports.csvNote")}
        </p>
      </section>

      {/* Customers (Phase 3B) */}
      <h2 className="mb-3 mt-6 font-[family-name:var(--font-cormorant)] text-[24px] font-semibold text-emerald">{t("reports.customersTitle")}</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {(
          [
            [t("reports.buyers"), String(cr.buyers), t("reports.newReturning", { n: cr.newBuyers, r: cr.returning })],
            [t("reports.repeatRate"), cr.repeatRate === null ? "—" : `${cr.repeatRate}%`, t("reports.repeatHint")],
            [t("reports.accountSales"), String(cr.fromAccounts), t("reports.guestSales", { n: cr.guestSales })],
            [t("reports.newAccounts"), String(cr.newAccounts), t("reports.inRange")],
          ] as const
        ).map(([label, value, sub]) => (
          <div key={label} className="min-w-0 rounded-[18px] border border-[#E1E6DF] bg-white p-[18px] shadow-[0_6px_18px_rgba(14,59,46,0.05)]">
            <p className="m-0 text-[13px] text-muted">{label}</p>
            <p className="m-0 font-[family-name:var(--font-cormorant)] text-[30px] font-semibold leading-tight text-emerald">{value}</p>
            <p className="m-0 text-[12px] text-muted">{sub}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section aria-labelledby="top" className={`${panel} lg:col-span-2`}>
          <h2 id="top" className={h2}>
            {t("reports.topCustomers")}
          </h2>
          {cr.top.length === 0 ? (
            <p className="m-0 text-[14px] text-muted">{t("reports.noSales")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] border-collapse text-[14px]">
                <thead>
                  <tr>
                    <th className={th}>{t("reports.customer")}</th>
                    <th className={`${th} text-end`}>{t("reports.orders")}</th>
                    <th className={`${th} text-end`}>{t("reports.value")}</th>
                  </tr>
                </thead>
                <tbody>
                  {cr.top.map((c) => (
                    <tr key={c.phone}>
                      <td className={td}>
                        {c.customerId ? (
                          <Link href={`/admin/customers/${c.customerId}`} className="text-emerald underline">
                            <bdi>{c.name}</bdi>
                          </Link>
                        ) : (
                          <bdi>{c.name}</bdi>
                        )}{" "}
                        <small className="text-muted" dir="ltr">
                          {c.phone}
                        </small>
                      </td>
                      <td className={`${td} text-end`}>{c.orders}</td>
                      <td className={`${td} text-end`}>{sar(c.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <div className="flex min-w-0 flex-col gap-4">
          <section aria-labelledby="disc" className={panel}>
            <h2 id="disc" className={h2}>
              {t("reports.discountsTitle")}
            </h2>
            <dl className="m-0">
              {cr.discounts.map((d) => (
                <div key={d.kind} className="flex justify-between gap-3 border-b border-[#F0EBE1] py-1.5 text-[14px] last:border-b-0">
                  <dt className="text-muted">{t(`reports.discount.${d.kind as "code"}`)}</dt>
                  <dd className="m-0 tabular-nums">
                    {sar(d.value)} <small className="text-muted">· {t("reports.ordersN", { count: d.orders })}</small>
                  </dd>
                </div>
              ))}
            </dl>
          </section>
          <section aria-labelledby="lvl" className={panel}>
            <h2 id="lvl" className={h2}>
              {t("reports.levelsTitle")}
            </h2>
            <dl className="m-0">
              {cr.perLevel.map((l) => (
                <div key={l.slug} className="flex justify-between gap-3 border-b border-[#F0EBE1] py-1.5 text-[14px] last:border-b-0">
                  <dt className="text-muted">{t(`customers.level.${l.slug as "silver"}`)}</dt>
                  <dd className="m-0 tabular-nums">{l.count}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </div>
      {cr.failed && <p className="m-0 mt-2 text-[13px] text-rani">{t("dashboard.loadFailed")}</p>}
    </>
  );
}
