import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AccountShell, { Card } from "@/components/account/AccountShell";
import SignInForm from "@/components/account/SignInForm";
import { getAccount } from "@/lib/customer/account";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ error?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Account" });
  return { title: `${t("signInTitle")} · Thaanora`, robots: { index: false } };
}

export default async function AccountSignIn({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const account = await getAccount();
  if (account.state !== "guest") redirect(`/${locale}/account`);
  const [t, sp] = [await getTranslations("Account"), await searchParams];

  return (
    <AccountShell narrow>
      <Card labelledBy="signin">
        <span className="th-medal mx-auto mb-3 flex" aria-hidden="true">
          T
        </span>
        <h1 id="signin" className="m-0 text-center font-[family-name:var(--font-cormorant)] text-[30px] font-semibold leading-tight text-emerald">
          {t("signInTitle")}
        </h1>
        <p className="mb-4 mt-1 text-center text-[14px] text-muted">{t("signInIntro")}</p>
        <SignInForm linkFailed={sp.error === "link"} />
        <p className="mb-0 mt-4 border-t border-line pt-3 text-center text-[13px] text-muted">{t("guestNote")}</p>
      </Card>
    </AccountShell>
  );
}
