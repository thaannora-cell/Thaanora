import Link from "next/link";
import { redirect } from "next/navigation";
import SectionDenied from "@/components/admin/SectionDenied";
import StatusChip from "@/components/admin/StatusChip";
import { getSession } from "@/lib/admin/session";
import { getAdminLang, getAdminT } from "@/lib/admin/i18n";
import { canOpen } from "@/lib/admin/sections";
import { STATUSES, isStatus, listOrders } from "@/lib/admin/orders";
import { amount, areaKey, orderTime } from "@/lib/admin/format";

export const dynamic = "force-dynamic";

const filterCls =
  "inline-flex min-h-[36px] items-center whitespace-nowrap rounded-full border px-3 text-[13px] no-underline aria-[current=page]:border-emerald aria-[current=page]:bg-emerald aria-[current=page]:text-white border-[#DDD3C0] bg-white text-emerald";
const td = "border-b border-[#F0EBE1] px-2 py-2.5 align-top";

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const session = await getSession();
  if (session.state !== "staff") redirect("/admin/sign-in");
  if (!canOpen(session.staff.role, "orders")) return <SectionDenied role={session.staff.role} section="orders" />;

  const sp = await searchParams;
  const status = sp.status && isStatus(sp.status) ? sp.status : null;
  const q = (sp.q ?? "").slice(0, 40);
  const [{ orders, counts, total, failed }, t, lang] = [await listOrders(status, q), await getAdminT(), await getAdminLang()];
  const sar = (n: number) => t("money", { amount: amount(lang, n) });
  const area = (a: string) => {
    const k = areaKey(a);
    return k ? t(`areas.${k}`) : a.split(" (")[0];
  };
  const href = (s: string | null) => {
    const p = new URLSearchParams();
    if (s) p.set("status", s);
    if (q) p.set("q", q);
    const qs = p.toString();
    return `/admin/orders${qs ? `?${qs}` : ""}`;
  };
  const suits = (o: (typeof orders)[number]) => o.suits.map((s) => (s.qty > 1 ? `${s.name} × ${s.qty}` : s.name));

  return (
    <>
      <div className="mb-[18px] flex flex-wrap items-center gap-3">
        <div className="min-w-0">
          <h1 className="m-0 font-[family-name:var(--font-cormorant)] text-[28px] font-semibold leading-tight text-emerald md:text-[34px]">{t("orders.title")}</h1>
          <p className="m-0 text-[14px] text-muted">{t("orders.sub")}</p>
        </div>
        <form method="get" className="flex w-full gap-2 sm:ms-auto sm:w-auto">
          {status && <input type="hidden" name="status" value={status} />}
          <label className="min-w-0 flex-1 sm:w-[260px] sm:flex-none">
            <span className="sr-only">{t("orders.search")}</span>
            <input type="search" name="q" defaultValue={q} placeholder={t("orders.search")} className="min-h-[42px] w-full rounded-full border border-[#DDD3C0] bg-white px-4 text-[15px] focus:border-gold focus:outline-none" />
          </label>
          <button type="submit" className="min-h-[42px] shrink-0 rounded-full border border-emerald bg-emerald px-4 text-[14px] font-medium text-ivory-white">
            {t("orders.find")}
          </button>
        </form>
      </div>

      <nav aria-label={t("orders.filters")} className="-mx-4 mb-3 overflow-x-auto px-4 md:mx-0 md:px-0">
        <ul className="m-0 flex list-none gap-1.5 p-0 md:flex-wrap">
          <li>
            <Link href={href(null)} aria-current={!status ? "page" : undefined} className={filterCls}>
              {t("orders.all")} ({total})
            </Link>
          </li>
          {STATUSES.map((s) => (
            <li key={s}>
              <Link href={href(s)} aria-current={status === s ? "page" : undefined} className={filterCls}>
                {t(`status.${s}`)} ({counts[s]})
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {failed && (
        <p role="alert" className="mb-4 rounded-xl border border-rani/30 bg-[#FBE7EE] px-3 py-2.5 text-[14px] text-rani">
          {t("dashboard.loadFailed")}
        </p>
      )}

      <section className="min-w-0 rounded-[18px] border border-[#E1E6DF] bg-white p-3 shadow-[0_6px_18px_rgba(14,59,46,0.05)] md:p-[18px]">
        {orders.length === 0 ? (
          <p className="m-0 p-2 text-[14px] text-muted">{q || status ? t("orders.noMatch") : t("dashboard.noOrders")}</p>
        ) : (
          <>
            <ul className="m-0 flex list-none flex-col p-0 lg:hidden">
              {orders.map((o) => (
                <li key={o.id} className="border-b border-[#F0EBE1] last:border-b-0">
                  <Link href={`/admin/orders/${o.orderNo}`} className="flex items-start justify-between gap-3 py-3 text-[14px] text-ink no-underline">
                    <span className="min-w-0">
                      <b className="block font-medium tabular-nums text-emerald" dir="ltr">
                        {o.orderNo}
                      </b>
                      <span className="block">
                        <bdi>{o.customer}</bdi> · {area(o.area)}
                      </span>
                      <small className="block truncate text-muted">{suits(o).join(", ")}</small>
                      <small className="block text-muted">{orderTime(lang, o.createdAt)}</small>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1 tabular-nums">
                      {sar(o.total)}
                      <StatusChip status={o.status} label={t(`status.${o.status}`)} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full border-collapse text-[14px]">
                <thead>
                  <tr>
                    {(["colOrder", "colTime", "colCustomer", "colArea", "colSuits", "colTotal", "colStatus", "colCourier"] as const).map((c) => (
                      <th key={c} className="th-caps whitespace-nowrap border-b border-[#E7E1D4] px-2 py-2 text-start text-[11px] font-semibold uppercase tracking-[0.1em] text-gold-ink">
                        {t(`orders.${c}`)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id} className="hover:bg-[#FAF8F3]">
                      <td className={td}>
                        <Link href={`/admin/orders/${o.orderNo}`} className="font-medium tabular-nums text-emerald underline-offset-2 hover:underline" dir="ltr">
                          {o.orderNo}
                        </Link>
                      </td>
                      <td className={`${td} whitespace-nowrap tabular-nums`}>{orderTime(lang, o.createdAt)}</td>
                      <td className={td}>
                        <bdi>{o.customer}</bdi>
                      </td>
                      <td className={td}>{area(o.area)}</td>
                      <td className={`${td} max-w-[240px] text-[13px]`}>
                        {suits(o).map((s, i) => (
                          <bdi key={i} className="block">
                            {s}
                          </bdi>
                        ))}
                      </td>
                      <td className={`${td} whitespace-nowrap tabular-nums`}>{sar(o.total)}</td>
                      <td className={td}>
                        <StatusChip status={o.status} label={t(`status.${o.status}`)} />
                      </td>
                      <td className={`${td} text-[13px]`}>
                        {o.courier ?? "—"}
                        {o.trackingNo && (
                          <small className="block text-muted" dir="ltr">
                            {o.trackingNo}
                          </small>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        <p className="m-0 mt-2.5 px-1 text-[12px] text-muted">{t("orders.note")}</p>
      </section>
    </>
  );
}
