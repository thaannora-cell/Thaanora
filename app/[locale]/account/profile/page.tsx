import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import AccountShell, { Card } from "@/components/account/AccountShell";
import ProfileForm from "@/components/account/ProfileForm";
import { getAccount } from "@/lib/customer/account";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false } };

export default async function AccountProfile({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const account = await getAccount();
  if (account.state === "guest") redirect(`/${locale}/account/sign-in`);
  if (account.state !== "customer") redirect(`/${locale}/account`);
  const t = await getTranslations("Account");

  return (
    <AccountShell narrow>
      <Link href="/account" className="mb-3 inline-flex min-h-[40px] items-center text-[14px] text-emerald underline underline-offset-2">
        {t("backToAccount")}
      </Link>
      <Card labelledBy="profile">
        <h1 id="profile" className="m-0 mb-4 font-[family-name:var(--font-cormorant)] text-[28px] font-semibold leading-tight text-emerald">
          {t("detailsTitle")}
        </h1>
        <ProfileForm customer={account.customer} />
        <p className="mb-0 mt-4 text-[12px] text-muted" dir="auto">
          {t("emailLine", { email: account.customer.email ?? "—" })}
        </p>
      </Card>
    </AccountShell>
  );
}
