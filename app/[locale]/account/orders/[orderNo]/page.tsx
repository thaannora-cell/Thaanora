import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import AccountShell, { Card } from "@/components/account/AccountShell";
import { OrderStatusChip, OrderTimeline } from "@/components/account/OrderBits";
import OrderActions from "@/components/account/OrderActions";
import { getAccount } from "@/lib/customer/account";
import { myOrder } from "@/lib/customer/orders";
import AccountIcon from "@/components/account/AccountIcon";
import ReturnCard from "@/components/account/ReturnCard";
import { returnableOrder } from "@/lib/customer/returns";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string; orderNo: string }>; searchParams: Promise<{ return?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orderNo } = await params;
  return { title: `${orderNo} · Thaanora`, robots: { index: false } };
}

// One of her orders: status timeline, suits and totals, courier, invoice, order again / cancel.
export default async function MyOrderPage({ params, searchParams }: Props) {
  const [{ locale, orderNo }, sp] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  const account = await getAccount();
  if (account.state === "guest") redirect(`/${locale}/account/sign-in`);
  if (account.state !== "customer") redirect(`/${locale}/account`);
  const [o, ret] = await Promise.all([myOrder(account.customer.id, orderNo.toUpperCase()), returnableOrder(account.customer.id, orderNo.toUpperCase())]);
  if (!o) notFound();

  const [t, tRack, tAreas, tCircle] = await Promise.all([getTranslations("Orders"), getTranslations("Rack"), getTranslations("Areas"), getTranslations("Circle")]);
  const sar = (n: number) => tRack("price", { amount: n });
  const areaKey = o.area.split(/\s+/)[0]?.toLowerCase() ?? "";
  const area = areaKey && tAreas.has(areaKey) ? tAreas(areaKey) : o.area;
  const placed = new Intl.DateTimeFormat(`${locale}-u-ca-gregory`, { day: "numeric", month: "long", year: "numeric" }).format(new Date(o.createdAt));
  const reorder = o.items.filter((i) => i.available > 0).map((i) => ({ code: i.code, qty: Math.min(i.qty, i.available), stitch: i.stitching }));
  const unavailable = o.items.filter((i) => i.available === 0).length;
  const row = (label: React.ReactNode, value: React.ReactNode, strong = false) => (
    <div className={`flex justify-between gap-3 py-1.5 text-[14px] ${strong ? "border-t border-line pt-2.5 text-[16px] font-semibold text-emerald" : ""}`}>
      <dt className={strong ? "" : "text-muted"}>{label}</dt>
      <dd className="m-0 text-end">{value}</dd>
    </div>
  );

  return (
    <AccountShell>
      <Link href="/account/orders" className="mb-2 inline-flex min-h-[40px] items-center text-[14px] text-emerald underline underline-offset-2">
        {t("backToOrders")}
      </Link>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 dir="ltr" className="m-0 font-[family-name:var(--font-cormorant)] text-[32px] font-semibold leading-tight text-emerald md:text-[38px]">
          {o.orderNo}
        </h1>
        <OrderStatusChip status={o.status} />
        <p className="m-0 w-full text-[14px] text-muted">{t("placed", { date: placed })}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card labelledBy="status">
          <h2 id="status" className="m-0 mb-3 text-[16px] font-semibold text-emerald flex items-center gap-2">
            <AccountIcon name="orders" />
            {t("statusTitle")}
          </h2>
          <OrderTimeline status={o.status} placedAt={o.createdAt} changedAt={o.updatedAt} courier={o.courier} trackingNo={o.trackingNo} locale={locale} />
          {(o.courier || o.trackingNo) && (
            <p className="mb-0 mt-3 text-[14px]">
              {t("courier", { courier: o.courier ?? "—" })}
              {o.trackingNo && (
                <>
                  {" · "}
                  {t("tracking")} <bdi dir="ltr">{o.trackingNo}</bdi>
                </>
              )}
            </p>
          )}
          <p className="mb-0 mt-3 text-[13px] text-muted">{t("deliveryTo", { area })}</p>
        </Card>

        <Card labelledBy="suits">
          <h2 id="suits" className="m-0 mb-2 text-[16px] font-semibold text-emerald flex items-center gap-2">
            <AccountIcon name="picks" />
            {t("suitsTitle", { count: o.suits })}
          </h2>
          <ul className="m-0 mb-2 flex list-none flex-col p-0">
            {o.items.map((i) => (
              <li key={i.code} className="flex justify-between gap-3 border-b border-line py-2 text-[14px] last:border-b-0">
                <span className="min-w-0">
                  <bdi className="block font-medium text-ink">{i.name}</bdi>
                  <small dir="ltr" className="text-[12px] text-muted">
                    {i.code}
                  </small>
                  {i.stitching && <small className="block text-[12px] text-gold-ink">{t("stitching")}</small>}
                </span>
                <span className="shrink-0 text-end">
                  {i.qty} × {sar(i.unitPrice)}
                </span>
              </li>
            ))}
          </ul>
          <dl className="m-0">
            {row(t("subtotal"), sar(o.subtotal))}
            {o.bundleDiscount > 0 && row(t("bundle"), `− ${sar(o.bundleDiscount)}`)}
            {o.codeDiscount > 0 && row(t("code", { code: o.discountCode ?? "" }), `− ${sar(o.codeDiscount)}`)}
            {o.perkDiscount > 0 &&
              row(
                t(o.discountKind === "loyalty" ? "perkLoyalty" : o.discountKind === "birthday" ? "perkBirthday" : "perkPersonal", {
                  pct: o.discountPct ?? 0,
                  level: o.loyaltyLevel && tCircle.has(`levels.${o.loyaltyLevel}`) ? tCircle(`levels.${o.loyaltyLevel}`) : "",
                }),
                `− ${sar(o.perkDiscount)}`,
              )}
            {row(o.packaging === "gift_box" ? t("giftBox") : t("bag"), o.packagingFee > 0 ? sar(o.packagingFee) : t("free"))}
            {row(t("delivery"), sar(o.deliveryFee))}
            {row(t("total"), sar(o.total), true)}
            {o.vat > 0 && row(t("vat"), sar(o.vat))}
          </dl>
          {o.isGift && <p className="mb-0 mt-2 text-[13px] text-gold-ink">{t("gift", { name: o.recipientName ?? "—" })}</p>}
        </Card>

        <Card labelledBy="actions" className="md:col-span-2">
          <h2 id="actions" className="sr-only">
            {t("actionsTitle")}
          </h2>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <OrderActions orderNo={o.orderNo} canCancel={o.status === "waiting_confirmation"} reorder={reorder} />
            {o.invoiceUrl && (
              <a href={o.invoiceUrl} target="_blank" rel="noopener noreferrer" className="th-btn no-underline">
                {t("invoice", { no: o.invoiceNo ?? "" })}
              </a>
            )}
          </div>
          {unavailable > 0 && <p className="mb-0 mt-2 text-[13px] text-muted">{t("someUnavailable", { count: unavailable })}</p>}
          {o.status === "delivered_cash_collected" && (
            <Link href="/account/reviews" className="mt-3 inline-flex min-h-[40px] items-center gap-2 text-[14px] font-medium text-emerald underline underline-offset-2">
              <AccountIcon name="picks" size={18} />
              {t("reviewLink")}
            </Link>
          )}
        </Card>

        {ret && <ReturnCard order={ret} locale={locale} justSent={sp.return === "sent"} />}
      </div>
    </AccountShell>
  );
}
