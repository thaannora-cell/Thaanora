import Link from "next/link";
import { redirect } from "next/navigation";
import Kpi from "@/components/admin/Kpi";
import StatusChip from "@/components/admin/StatusChip";
import { getSession } from "@/lib/admin/session";
import { getAdminLang, getAdminT } from "@/lib/admin/i18n";
import { getDashboard, type StockItem } from "@/lib/admin/dashboard";
import { amount, areaKey, longDate, orderTime, partOfDay } from "@/lib/admin/format";
import { canOpen } from "@/lib/admin/sections";

export const dynamic = "force-dynamic";

const panel = "min-w-0 rounded-[18px] border border-[#E1E6DF] bg-white p-[18px] shadow-[0_6px_18px_rgba(14,59,46,0.05)]";
const smallBtn =
  "inline-flex min-h-[34px] shrink-0 items-center rounded-full border border-[#CFC3AA] bg-white px-3 text-[13px] font-medium text-emerald no-underline transition-transform hover:-translate-y-0.5 motion-reduce:hover:translate-y-0";
const line = "flex items-center justify-between gap-3 border-b border-[#F0EBE1] py-2 text-[14px] last:border-b-0";

export default async function Dashboard() {
  const session = await getSession();
  if (session.state !== "staff") redirect("/admin/sign-in");
  const [t, lang] = [await getAdminT(), await getAdminLang()];
  const { role } = session.staff;
  const { orders, stock, failed } = await getDashboard(role);
  const sar = (n: number) => t("money", { amount: amount(lang, n) });
  const area = (a: string) => {
    const k = areaKey(a);
    return k ? t(`areas.${k}`) : a.split(" (")[0];
  };
  const stockLine = (x: StockItem, chip: React.ReactNode) => (
    <li key={x.id} className={line}>
      <span className="min-w-0">
        {chip} <bdi>{x.name}</bdi> <small className="text-muted">· <bdi>{x.brand}</bdi></small>
      </span>
      <Link href="/admin/stock" className={smallBtn}>
        {t("dashboard.restock")}
      </Link>
    </li>
  );

  const attention = [
    orders && orders.waiting > 0 && (
      <li key="waiting" className={line}>
        <span>{t("dashboard.waitingLine", { count: orders.waiting })}</span>
        <Link href="/admin/orders" className={smallBtn}>
          {t("dashboard.open")}
        </Link>
      </li>
    ),
    ...(stock?.soldOut ?? []).map((x) =>
      stockLine(x, <span className="rounded-full bg-[#5C635F] px-2 py-0.5 text-[11px] font-medium text-white">{t("dashboard.soldOut")}</span>),
    ),
    ...(stock?.low ?? []).map((x) =>
      stockLine(x, <span className="rounded-full bg-[#FBE7EE] px-2 py-0.5 text-[11px] font-medium text-rani">{t("dashboard.left", { count: x.stock })}</span>),
    ),
    orders && orders.newRequests > 0 && (
      <li key="requests" className={line}>
        <span>{t("dashboard.requestsLine", { count: orders.newRequests })}</span>
        <Link href="/admin/requests" className={smallBtn}>
          {t("dashboard.open")}
        </Link>
      </li>
    ),
  ].filter(Boolean);

  return (
    <>
      <div className="mb-[18px] flex flex-wrap items-center gap-3">
        <div className="min-w-0">
          <h1 className="m-0 font-[family-name:var(--font-cormorant)] text-[28px] font-semibold leading-tight text-emerald md:text-[34px]">
            {t(`dashboard.${partOfDay()}`, { name: session.staff.name })}
          </h1>
          <p className="m-0 text-[14px] text-muted">{t("dashboard.today", { date: longDate(lang) })}</p>
        </div>
        {canOpen(role, "products") && (
          <Link
            href="/admin/products"
            className="ms-auto inline-flex min-h-[42px] items-center rounded-full border border-emerald bg-emerald px-4 text-[14px] font-medium text-ivory-white no-underline transition-transform hover:-translate-y-0.5 motion-reduce:hover:translate-y-0"
          >
            {t("dashboard.addProduct")}
          </Link>
        )}
      </div>

      {failed && (
        <p role="alert" className="mb-4 rounded-xl border border-rani/30 bg-[#FBE7EE] px-3 py-2.5 text-[14px] text-rani">
          {t("dashboard.loadFailed")}
        </p>
      )}

      {orders && (
        <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
          <Kpi icon="ord" value={orders.waiting} label={t("dashboard.kpiWaiting")} warn={orders.waiting > 0} />
          <Kpi icon="stock" value={orders.withCourier} label={t("dashboard.kpiCourier")} />
          <Kpi icon="off" value={sar(orders.cashCollected)} label={t("dashboard.kpiCash")} />
          <Kpi icon="rep" value={`${orders.refusedPct}%`} label={t("dashboard.kpiRefused")} warn={orders.refused > 0} />
        </div>
      )}

      <div className={`mt-4 grid grid-cols-1 gap-4 ${orders ? "xl:grid-cols-[1.4fr_1fr]" : ""}`}>
        {orders && (
          <section aria-labelledby="latest" className={panel}>
            <h2 id="latest" className="m-0 mb-3 text-[16px] font-semibold text-emerald">
              {t("dashboard.latest")} <small className="font-normal text-muted">· {t("dashboard.latestHint")}</small>
            </h2>
            {orders.latest.length === 0 ? (
              <p className="m-0 text-[14px] text-muted">{t("dashboard.noOrders")}</p>
            ) : (
              <>
                {/* Phone: one card per order */}
                <ul className="m-0 flex list-none flex-col p-0 md:hidden">
                  {orders.latest.map((o) => (
                    <li key={o.id} className="flex items-start justify-between gap-3 border-b border-[#F0EBE1] py-2.5 last:border-b-0">
                      <span className="min-w-0 text-[14px]">
                        <b className="block font-medium tabular-nums text-emerald" dir="ltr">
                          {o.orderNo}
                        </b>
                        <small className="block text-muted">
                          {orderTime(lang, o.createdAt)} · {area(o.area)}
                        </small>
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-1 text-[14px] tabular-nums">
                        {sar(o.total)}
                        <StatusChip status={o.status} label={t(`status.${o.status}`)} />
                      </span>
                    </li>
                  ))}
                </ul>
                {/* Tablet and desktop: the prototype table */}
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full border-collapse text-[14px]">
                    <thead>
                      <tr>
                        {(["colOrder", "colTime", "colArea", "colTotal", "colStatus"] as const).map((c) => (
                          <th key={c} className="th-caps whitespace-nowrap border-b border-[#E7E1D4] px-2 py-2 text-start text-[11px] font-semibold uppercase tracking-[0.1em] text-gold-ink">
                            {t(`dashboard.${c}`)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {orders.latest.map((o) => (
                        <tr key={o.id} className="hover:bg-[#FAF8F3]">
                          <td className="border-b border-[#F0EBE1] px-2 py-2.5 font-medium tabular-nums text-emerald" dir="ltr">
                            {o.orderNo}
                          </td>
                          <td className="whitespace-nowrap border-b border-[#F0EBE1] px-2 py-2.5 tabular-nums">{orderTime(lang, o.createdAt)}</td>
                          <td className="border-b border-[#F0EBE1] px-2 py-2.5">{area(o.area)}</td>
                          <td className="whitespace-nowrap border-b border-[#F0EBE1] px-2 py-2.5 tabular-nums">{sar(o.total)}</td>
                          <td className="border-b border-[#F0EBE1] px-2 py-2.5">
                            <StatusChip status={o.status} label={t(`status.${o.status}`)} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        )}

        <section aria-labelledby="attention" className={panel}>
          <h2 id="attention" className="m-0 mb-1 text-[16px] font-semibold text-emerald">
            {t("dashboard.attention")}
          </h2>
          <ul className="m-0 list-none p-0">
            {attention.length === 0 && <li className={`${line} text-muted`}>{t("dashboard.allClear")}</li>}
            {attention}
            {stock && (
              <li className={`${line} flex-wrap`}>
                <span>{t("dashboard.stockLine")}</span>
                <b className="font-medium tabular-nums text-emerald">
                  {t("dashboard.stockValue", { units: stock.units, value: sar(stock.value) })}
                </b>
              </li>
            )}
          </ul>
        </section>
      </div>
    </>
  );
}
