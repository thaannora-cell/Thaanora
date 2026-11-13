import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import SectionDenied from "@/components/admin/SectionDenied";
import StatusChip from "@/components/admin/StatusChip";
import StatusActions from "@/components/admin/orders/StatusActions";
import DeliveryForm from "@/components/admin/orders/DeliveryForm";
import { getSession } from "@/lib/admin/session";
import { getAdminLang, getAdminT } from "@/lib/admin/i18n";
import { canOpen } from "@/lib/admin/sections";
import { COURIERS, NEXT, getOrder } from "@/lib/admin/orders";
import { customerMessage } from "@/lib/admin/customer-message";
import { getWhatsappNumber } from "@/lib/shop-data";
import ShopNumberNote from "@/components/admin/ShopNumberNote";
import InvoiceRetry from "@/components/admin/orders/InvoiceRetry";
import OrderWhatsappLink from "@/components/admin/orders/OrderWhatsappLink";
import { amount, areaKey, orderTime } from "@/lib/admin/format";
import { orderCustomerFacts } from "@/lib/admin/customers";
import { TAG_TONE } from "@/components/admin/customers/tone";

export const dynamic = "force-dynamic";

const panel = "min-w-0 rounded-[18px] border border-[#E1E6DF] bg-white p-[18px] shadow-[0_6px_18px_rgba(14,59,46,0.05)]";
const h2 = "m-0 mb-3 text-[16px] font-semibold text-emerald";
const PATH = ["waiting_confirmation", "confirmed", "packed", "with_courier", "delivered_cash_collected"] as const;

export default async function OrderPage({ params }: { params: Promise<{ orderNo: string }> }) {
  const session = await getSession();
  if (session.state !== "staff") redirect("/admin/sign-in");
  if (!canOpen(session.staff.role, "orders")) return <SectionDenied role={session.staff.role} section="orders" />;

  const { orderNo } = await params;
  if (!/^TH-\d{3,7}$/.test(orderNo)) notFound();
  const o = await getOrder(orderNo);
  if (!o) notFound();
  const shop = await getWhatsappNumber();
  const [t, lang, msg, facts] = [await getAdminT(), await getAdminLang(), await customerMessage(o, shop), await orderCustomerFacts(o.phone, o.customerId)];
  const beforeSending = ["waiting_confirmation", "confirmed", "packed"].includes(o.status);
  const sar = (n: number) => t("money", { amount: amount(lang, n) });
  const area = (a: string) => {
    const k = areaKey(a);
    return k ? t(`areas.${k}`) : a;
  };
  // An invoice still "pending" after 5 minutes was interrupted; let staff try again.
  const stuck = o.invoice.status === "pending" && (!o.invoice.triedAt || Date.parse(o.invoice.triedAt) < Date.now() - 5 * 60 * 1000);
  const suits = o.items.reduce((n, i) => n + i.qty, 0);
  const ended = o.status === "cancelled" || o.status === "refused_at_door";
  const reached = PATH.indexOf(o.status as (typeof PATH)[number]);
  const row = (label: string, value: React.ReactNode, strong = false) => (
    <div className={`flex justify-between gap-3 py-1 ${strong ? "border-t border-[#F0EBE1] pt-2 text-[16px] font-semibold text-emerald" : "text-[14px]"}`}>
      <dt>{label}</dt>
      <dd className="m-0 tabular-nums">{value}</dd>
    </div>
  );

  return (
    <>
      <Link href="/admin/orders" className="mb-2 inline-flex min-h-[36px] items-center text-[14px] text-emerald underline underline-offset-2">
        {t("orders.back")}
      </Link>
      <div className="mb-[18px] flex flex-wrap items-center gap-3">
        <h1 className="m-0 font-[family-name:var(--font-cormorant)] text-[28px] font-semibold leading-tight text-emerald md:text-[34px]" dir="ltr">
          {o.orderNo}
        </h1>
        <StatusChip status={o.status} label={t(`status.${o.status}`)} />
        <p className="m-0 w-full text-[14px] text-muted">
          {t("orders.placed", { time: orderTime(lang, o.createdAt) })} · {t("orders.changed", { time: orderTime(lang, o.statusChangedAt) })}
        </p>
      </div>

      {/* Status path */}
      <ol className="m-0 mb-4 grid list-none grid-cols-5 gap-1 p-0" aria-label={t("orders.progress")}>
        {PATH.map((s, i) => {
          const done = !ended && reached >= i;
          return (
            <li key={s} className="flex min-w-0 flex-col gap-1.5" aria-current={o.status === s ? "step" : undefined}>
              <span className={`h-1.5 rounded-full ${done ? "bg-emerald" : "bg-[#DDE3DE]"}`} />
              <small className={`text-[11px] leading-tight ${o.status === s ? "font-semibold text-emerald" : "text-muted"}`}>{t(`status.${s}`)}</small>
            </li>
          );
        })}
      </ol>
      {o.needsCall && beforeSending && (
        <p role="alert" className="m-0 mb-4 rounded-xl border border-gold/60 bg-[#FBF6EA] px-3 py-2.5 text-[14px] text-ink">
          <b className="text-emerald">{t("orders.callFirst")}</b> {t("orders.callFirstText", { count: facts.refusals })}
        </p>
      )}
      {ended && (
        <p className="m-0 mb-4 rounded-xl bg-[#EEF0EE] px-3 py-2 text-[14px] text-[#3D4440]">{t(o.status === "cancelled" ? "orders.endedCancelled" : "orders.endedRefused")}</p>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.25fr_1fr]">
        <div className="flex min-w-0 flex-col gap-4">
          <section aria-labelledby="st" className={panel}>
            <h2 id="st" className={h2}>
              {t("orders.statusTitle")}
            </h2>
            <StatusActions orderId={o.id} status={o.status} next={NEXT[o.status]} suits={suits} />
          </section>

          <section aria-labelledby="wa" className={panel}>
            <h2 id="wa" className={h2}>
              {t("orders.messageTitle")} <small className="font-normal text-muted">· {t(`orders.lang.${o.language}`)}</small>
            </h2>
            {msg ? (
              <>
                <pre className="m-0 mb-3 max-h-[260px] overflow-auto whitespace-pre-wrap rounded-xl bg-[#F4F7F4] p-3 font-[family-name:var(--font-jost)] text-[13px] text-ink" dir="auto">
                  {msg.text}
                </pre>
                <OrderWhatsappLink
                  href={msg.url}
                  orderNo={o.orderNo}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-rani px-5 text-[15px] font-medium text-white no-underline"
                >
                  {t(`orders.send.${msg.kind}`)}
                </OrderWhatsappLink>
                <p className="m-0 mt-2 text-[12px] text-muted">{t("orders.messageHint")}</p>
                <ShopNumberNote number={shop} />
              </>
            ) : (
              <p className="m-0 text-[14px] text-muted">{t("orders.noPhone")}</p>
            )}
          </section>

          <section aria-labelledby="inv" className={panel}>
            <h2 id="inv" className={h2}>
              {t("orders.invoice.title")}
            </h2>
            {o.status !== "delivered_cash_collected" && o.invoice.status !== "issued" ? (
              <p className="m-0 text-[14px] text-muted">{t("orders.invoice.later")}</p>
            ) : o.invoice.status === "issued" ? (
              <div className="flex flex-col gap-2">
                <p className="m-0 text-[14px]">
                  {t.rich("orders.invoice.issued", { no: o.invoice.no ?? "—", b: (c) => <b dir="ltr" className="font-medium text-emerald">{c}</b> })}
                </p>
                <div className="flex flex-wrap gap-2">
                  {o.invoice.hasPdf && (
                    <a
                      href={`/admin/orders/${o.orderNo}/invoice`}
                      target="_blank"
                      rel="noopener"
                      className="inline-flex min-h-[44px] items-center rounded-full bg-emerald px-5 text-[15px] font-medium text-ivory-white no-underline"
                    >
                      {t("orders.invoice.view")}
                    </a>
                  )}
                  {o.invoice.url && (
                    <a href={o.invoice.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center rounded-full border border-[#CFC3AA] bg-white px-5 text-[14px] text-emerald no-underline">
                      {t("orders.invoice.customerLink")}
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <p role={o.invoice.status === "failed" ? "alert" : undefined} className={`m-0 text-[14px] ${o.invoice.status === "failed" ? "text-rani" : "text-muted"}`}>
                  {o.invoice.status === "failed"
                    ? t("orders.invoice.failed", { count: o.invoice.attempts })
                    : o.invoice.status === "pending"
                      ? t("orders.invoice.pending")
                      : t("orders.invoice.none")}
                </p>
                {o.invoice.error && (
                  <p className="m-0 rounded-xl bg-[#FBEFF3] px-3 py-2 text-[13px] text-[#7A1238]" dir="auto">
                    {o.invoice.error}
                  </p>
                )}
                {(o.invoice.status !== "pending" || stuck) && <InvoiceRetry orderId={o.id} label={o.invoice.status === "failed" ? "retry" : "create"} />}
                <p className="m-0 text-[12px] text-muted">{t("orders.invoice.retryHint")}</p>
              </div>
            )}
          </section>

          <section aria-labelledby="dl" className={panel}>
            <h2 id="dl" className={h2}>
              {t("orders.deliveryTitle")}
            </h2>
            <DeliveryForm orderId={o.id} courier={o.courier} trackingNo={o.trackingNo} notes={o.notes} couriers={COURIERS} />
          </section>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <section aria-labelledby="cu" className={panel}>
            <h2 id="cu" className={h2}>
              {t("orders.customerTitle")}
            </h2>
            <dl className="m-0">
              {row(t("orders.name"), <bdi>{o.customer}</bdi>)}
              {row(t("orders.phone"), <bdi dir="ltr">{o.phone}</bdi>)}
              {facts.refusals > 0 && row(t("orders.refusals"), <span className="text-rani">{String(facts.refusals)}</span>)}
              {o.customerId &&
                row(
                  t("orders.account"),
                  <span className="inline-flex flex-wrap items-center justify-end gap-1.5">
                    {facts.tags.map((x) => (
                      <span key={x} className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${TAG_TONE[x]}`}>
                        {t(`customers.tag.${x}`)}
                      </span>
                    ))}
                    <Link href={`/admin/customers/${o.customerId}`} className="text-emerald underline">
                      {t("orders.viewCustomer")}
                    </Link>
                  </span>,
                )}
              {row(t("orders.area"), area(o.area))}
              {o.address && row(t("orders.address"), <bdi>{o.address}</bdi>)}
              {row(t("orders.packaging"), t(o.packaging === "gift_box" ? "orders.giftBox" : "orders.keeperBag"))}
            </dl>
            {o.isGift && (
              <div className="mt-2 rounded-xl border border-gold/40 bg-gold/10 p-3 text-[14px]">
                <b className="block text-emerald">{t("orders.gift")}</b>
                {o.recipientName && <span className="block">{t("orders.giftFor", { name: o.recipientName })}</span>}
                {o.recipientArea && <span className="block">{t("orders.giftArea", { area: o.recipientArea })}</span>}
                {o.giftNote && <span className="block whitespace-pre-wrap">“{o.giftNote}”</span>}
              </div>
            )}
          </section>

          <section aria-labelledby="it" className={panel}>
            <h2 id="it" className={h2}>
              {t("orders.itemsTitle", { count: suits })}
            </h2>
            <ul className="m-0 mb-3 list-none p-0">
              {o.items.map((i) => (
                <li key={i.id} className="flex justify-between gap-3 border-b border-[#F0EBE1] py-2 text-[14px] last:border-b-0">
                  <span className="min-w-0">
                    <bdi className="block font-medium text-emerald">{i.name}</bdi>
                    <small className="text-muted">
                      <bdi dir="ltr">{i.code}</bdi>
                      {i.stitching && ` · ${t("orders.stitching")}`}
                    </small>
                  </span>
                  <span className="shrink-0 tabular-nums">
                    {i.qty} × {sar(i.unitPrice)}
                  </span>
                </li>
              ))}
            </ul>
            <dl className="m-0">
              {row(t("orders.subtotal"), sar(o.subtotal))}
              {o.bundleDiscount > 0 && row(t("orders.bundle"), `−${sar(o.bundleDiscount)}`)}
              {o.codeDiscount > 0 && row(t("orders.code", { code: o.discountCode ?? "" }), `−${sar(o.codeDiscount)}`)}
              {o.perkDiscount > 0 &&
                row(
                  t(o.discountKind === "loyalty" ? "orders.perkLoyalty" : o.discountKind === "birthday" ? "orders.perkBirthday" : "orders.perkPersonal", {
                    pct: o.discountPct ?? 0,
                    level: o.loyaltyLevel === "silver" || o.loyaltyLevel === "gold" || o.loyaltyLevel === "emerald" ? t(`circle.${o.loyaltyLevel}`) : (o.loyaltyLevel ?? ""),
                  }),
                  `−${sar(o.perkDiscount)}`,
                )}
              {o.packagingFee > 0 && row(t("orders.giftBox"), sar(o.packagingFee))}
              {row(t("orders.delivery"), o.deliveryFee > 0 ? sar(o.deliveryFee) : t("orders.free"))}
              {row(t("orders.total"), sar(o.total), true)}
              {o.vat > 0 && row(t("orders.vat"), t("money", { amount: o.vat.toFixed(2) }))}
            </dl>
          </section>
        </div>
      </div>
    </>
  );
}
