import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import AccountShell, { Card } from "@/components/account/AccountShell";
import { OrderStatusChip } from "@/components/account/OrderBits";
import { getAccount } from "@/lib/customer/account";
import { myOrders } from "@/lib/customer/orders";
import { AccountMedal } from "@/components/account/AccountIcon";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Orders" });
  return { title: `${t("title")} · Thaanora`, robots: { index: false } };
}

// All her orders, newest first.
export default async function MyOrdersPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const account = await getAccount();
  if (account.state === "guest") redirect(`/${locale}/account/sign-in`);
  if (account.state !== "customer") redirect(`/${locale}/account`);
  const [t, tAcc, tRack, orders] = await Promise.all([getTranslations("Orders"), getTranslations("Account"), getTranslations("Rack"), myOrders(account.customer.id)]);
  const date = (iso: string) => new Intl.DateTimeFormat(`${locale}-u-ca-gregory`, { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));

  return (
    <AccountShell>
      <Link href="/account" className="mb-2 inline-flex min-h-[40px] items-center text-[14px] text-emerald underline underline-offset-2">
        {tAcc("backToAccount")}
      </Link>
      <h1 className="m-0 mb-4 font-[family-name:var(--font-cormorant)] text-[32px] font-semibold leading-tight text-emerald md:text-[38px] flex items-center gap-3">
          <AccountMedal name="orders" />{t("title")}</h1>
      <Card className="p-2 md:p-3">
        {orders.length === 0 ? (
          <div className="flex flex-col items-start gap-3 p-3">
            <p className="m-0 text-[14px] text-muted">{t("empty")}</p>
            <Link href="/" className="th-btn th-btn-pink no-underline">
              {t("shop")}
            </Link>
          </div>
        ) : (
          <ul className="m-0 flex list-none flex-col p-0">
            {orders.map((o) => (
              <li key={o.orderNo} className="border-b border-line last:border-b-0">
                <Link href={`/account/orders/${o.orderNo}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl p-3 no-underline transition-colors hover:bg-ivory">
                  <b dir="ltr" className="font-medium text-emerald">
                    {o.orderNo}
                  </b>
                  <OrderStatusChip status={o.status} />
                  <span aria-hidden="true" className="ms-auto text-[18px] leading-none text-gold-ink rtl:rotate-180">
                    ›
                  </span>
                  <span className="w-full text-[13px] text-muted">{tAcc("orderLine", { suits: o.suits, total: tRack("price", { amount: o.total }), date: date(o.createdAt) })}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </AccountShell>
  );
}
