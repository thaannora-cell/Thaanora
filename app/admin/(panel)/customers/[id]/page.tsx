import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import SectionDenied from "@/components/admin/SectionDenied";
import StatusChip from "@/components/admin/StatusChip";
import CustomerNotesForm from "@/components/admin/customers/CustomerNotesForm";
import { TAG_TONE } from "@/components/admin/customers/tone";
import { getSession } from "@/lib/admin/session";
import { getAdminLang, getAdminT } from "@/lib/admin/i18n";
import { canOpen } from "@/lib/admin/sections";
import { orderTime } from "@/lib/admin/format";
import { getCustomer } from "@/lib/admin/customers";
import type { OrderStatus } from "@/lib/admin/dashboard";

export const dynamic = "force-dynamic";

const panel = "min-w-0 rounded-[18px] border border-[#E1E6DF] bg-white p-[18px] shadow-[0_6px_18px_rgba(14,59,46,0.05)]";
const h2 = "m-0 mb-3 text-[16px] font-semibold text-emerald";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LANG = { en: "English", ar: "العربية", ur: "اردو", hi: "हिन्दी" } as Record<string, string>;

// One customer: contact, figures, Circle level, COD record, staff tags and notes, orders, and more.
export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (session.state !== "staff") redirect("/admin/sign-in");
  if (!canOpen(session.staff.role, "customers")) return <SectionDenied role={session.staff.role} section="customers" />;
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const c = await getCustomer(id);
  if (!c) notFound();
  const [t, lang] = [await getAdminT(), await getAdminLang()];
  const sar = (n: number) => t("money", { amount: n });
  const day = (iso: string) => new Intl.DateTimeFormat(`${lang}-u-ca-gregory`, { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
  const row = (label: string, value: React.ReactNode) => (
    <div className="flex justify-between gap-3 border-b border-[#F0EBE1] py-2 text-[14px] last:border-b-0">
      <dt className="text-muted">{label}</dt>
      <dd className="m-0 min-w-0 text-end">{value}</dd>
    </div>
  );

  return (
    <>
      <Link href="/admin/customers" className="mb-2 inline-flex min-h-[36px] items-center text-[14px] text-emerald underline underline-offset-2">
        {t("customers.back")}
      </Link>
      <div className="mb-[18px] flex flex-wrap items-center gap-2">
        <h1 className="m-0 font-[family-name:var(--font-cormorant)] text-[28px] font-semibold leading-tight text-emerald md:text-[34px]">
          <bdi>{c.name}</bdi>
        </h1>
        {c.tags.map((x) => (
          <span key={x} className={`rounded-full px-2.5 py-0.5 text-[12px] font-medium ${TAG_TONE[x]}`}>
            {t(`customers.tag.${x}`)}
          </span>
        ))}
        {c.status === "deactivated" && <span className="rounded-full bg-[#F1EEE8] px-2.5 py-0.5 text-[12px] text-muted">{t("customers.deactivated")}</span>}
      </div>

      {c.refusals > 0 && (
        <p role="alert" className="mb-4 rounded-xl border border-rani/30 bg-[#FBE7EE] px-3 py-2.5 text-[14px] text-rani">
          {t("customers.refusalWarning", { count: c.refusals })}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className={panel} aria-labelledby="contact">
          <h2 id="contact" className={h2}>
            {t("customers.contactTitle")}
          </h2>
          <dl className="m-0">
            {row(t("customers.phone"), <bdi dir="ltr">{c.phone}</bdi>)}
            {row(t("customers.email"), c.email ? <bdi dir="ltr">{c.email}</bdi> : "—")}
            {row(t("customers.language"), LANG[c.language] ?? c.language)}
            {row(t("customers.birthday"), c.birthday ? day(c.birthday) : "—")}
            {row(t("customers.joined"), day(c.joinedAt))}
            {row(t("customers.addresses"), String(c.addresses))}
          </dl>
          <a href={`https://wa.me/${c.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-[44px] items-center rounded-full border border-[#BFDCCB] bg-[#E7F3EC] px-4 text-[14px] font-medium text-emerald no-underline">
            {t("customers.whatsapp")}
          </a>
          {session.staff.role === "owner" && c.status === "active" && (
            <Link href={`/admin/outreach?kind=offer&segment=customer&value=${c.id}`} className="ms-2 mt-3 inline-flex min-h-[44px] items-center rounded-full border border-rani/40 bg-[#FBEFF3] px-4 text-[14px] font-medium text-[#7A1238] no-underline">
              {t("customers.giveOffer")}
            </Link>
          )}
        </section>

        <section className={panel} aria-labelledby="figures">
          <h2 id="figures" className={h2}>
            {t("customers.figuresTitle")}
          </h2>
          <dl className="m-0">
            {row(t("customers.spent"), <b className="text-emerald">{sar(c.spent)}</b>)}
            {row(t("customers.orders"), String(c.orders))}
            {row(t("customers.circle"), `${c.level ? t(`customers.level.${c.level as "silver" | "gold" | "emerald"}`) : t("customers.level.none")} · ${t("customers.suits12m", { count: c.suits12m })}`)}
            {row(t("customers.refusalsLabel"), <span className={c.refusals ? "text-rani" : ""}>{String(c.refusals)}</span>)}
            {row(t("customers.lastOrderLabel"), c.lastOrderAt ? orderTime(lang, c.lastOrderAt) : "—")}
          </dl>
        </section>

        <section className={`${panel} lg:col-span-2`} aria-labelledby="staff">
          <h2 id="staff" className={h2}>
            {t("customers.staffTitle")}
          </h2>
          <CustomerNotesForm id={c.id} tags={c.tags} notes={c.notes} status={c.status} />
        </section>

        <section className={`${panel} lg:col-span-2`} aria-labelledby="orders">
          <h2 id="orders" className={h2}>
            {t("customers.ordersTitle")}
          </h2>
          {c.orderList.length === 0 ? (
            <p className="m-0 text-[14px] text-muted">{t("customers.noOrders")}</p>
          ) : (
            <ul className="m-0 flex list-none flex-col p-0">
              {c.orderList.map((o) => (
                <li key={o.orderNo} className="border-b border-[#F0EBE1] last:border-b-0">
                  <Link href={`/admin/orders/${o.orderNo}`} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-[14px] text-ink no-underline hover:bg-[#FAF8F3]">
                    <span>
                      <b className="font-medium text-emerald" dir="ltr">
                        {o.orderNo}
                      </b>{" "}
                      · {orderTime(lang, o.createdAt)}
                    </span>
                    <span className="flex items-center gap-2 tabular-nums">
                      {sar(o.total)}
                      <StatusChip status={o.status as OrderStatus} label={t(`status.${o.status as OrderStatus}`)} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={panel} aria-labelledby="more">
          <h2 id="more" className={h2}>
            {t("customers.moreTitle")}
          </h2>
          <dl className="m-0">
            {row(
              t("customers.favourites"),
              c.favourites.length ? (
                <bdi>{c.favourites.map((f) => f.name).join(" · ")}</bdi>
              ) : (
                "—"
              ),
            )}
            {row(t("customers.requests"), String(c.requests.length))}
            {row(t("customers.reviewsLabel"), c.reviews.length ? c.reviews.map((r) => `${"★".repeat(r.rating)} ${r.product}`).join(" · ") : "—")}
          </dl>
        </section>

        <section className={panel} aria-labelledby="rets">
          <h2 id="rets" className={h2}>
            {t("customers.returnsTitle")}
          </h2>
          {c.returns.length === 0 ? (
            <p className="m-0 text-[14px] text-muted">—</p>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-[14px]">
              {c.returns.map((r) => (
                <li key={r.id}>
                  <Link href={`/admin/returns/${r.id}`} dir="ltr" className="text-emerald underline">
                    {r.returnNo}
                  </Link>{" "}
                  · {t(`returns.status.${r.status as "requested"}`)} · {sar(r.refund)}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
