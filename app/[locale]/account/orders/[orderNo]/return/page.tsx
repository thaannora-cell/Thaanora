import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import AccountShell, { Card } from "@/components/account/AccountShell";
import { AccountMedal } from "@/components/account/AccountIcon";
import ReturnForm from "@/components/account/ReturnForm";
import { getAccount } from "@/lib/customer/account";
import { returnableOrder, returnWindowDays } from "@/lib/customer/returns";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string; orderNo: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Returns" });
  return { title: `${t("title")} · Thaanora`, robots: { index: false } };
}

// Ask to return suits from a delivered order, within the return window.
export default async function ReturnPage({ params }: Props) {
  const { locale, orderNo } = await params;
  setRequestLocale(locale);
  const account = await getAccount();
  if (account.state === "guest") redirect(`/${locale}/account/sign-in`);
  if (account.state !== "customer") redirect(`/${locale}/account`);
  const order = await returnableOrder(account.customer.id, orderNo.toUpperCase());
  if (!order) notFound();
  if (!order.open) redirect(`/${locale}/account/orders/${order.orderNo}`);

  const [t, days] = await Promise.all([getTranslations("Returns"), returnWindowDays()]);
  const until = new Intl.DateTimeFormat(`${locale}-u-ca-gregory`, { day: "numeric", month: "long", hour: "numeric", minute: "2-digit", timeZone: "Asia/Riyadh" }).format(new Date(order.windowEnds!));

  return (
    <AccountShell narrow>
      <Link href={`/account/orders/${order.orderNo}`} className="mb-2 inline-flex min-h-[40px] items-center text-[14px] text-emerald underline underline-offset-2">
        {t("backToOrder", { orderNo: order.orderNo })}
      </Link>
      <h1 className="m-0 flex items-center gap-3 font-[family-name:var(--font-cormorant)] text-[30px] font-semibold leading-tight text-emerald">
        <AccountMedal name="orders" />
        {t("title")}
      </h1>
      <p className="mb-4 mt-1 text-[14px] text-muted">{t("intro", { days, until })}</p>
      <Card>
        <ReturnForm orderNo={order.orderNo} items={order.items} discount={order.discount} deliveryFee={order.deliveryFee} packagingFee={order.packagingFee} />
      </Card>
    </AccountShell>
  );
}
