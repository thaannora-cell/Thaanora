import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AccountShell, { Card } from "@/components/account/AccountShell";
import SignInForm from "@/components/account/SignInForm";
import { getAccount } from "@/lib/customer/account";
import { isLocale, safeNextPath } from "@/lib/site-gate";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ error?: string; next?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Account" });
  return { title: `${t("signInTitle")} · Thaanora`, robots: { index: false } };
}

export default async function AccountSignIn({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [account, sp] = await Promise.all([getAccount(), searchParams]);
  const next = sp.next && isLocale(locale) ? safeNextPath(sp.next, locale) : null;
  if (account.state !== "guest") redirect(`/${locale}/account${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  const t = await getTranslations("Account");

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
        {next && <p className="mb-3 mt-0 rounded-xl bg-[#FBF3E6] px-3 py-2 text-center text-[13px] text-emerald">{t("toFinishOrder")}</p>}
        <SignInForm linkFailed={sp.error === "link"} next={next} />
        <p className="mb-0 mt-4 border-t border-line pt-3 text-center text-[13px] text-muted">{t("guestNote")}</p>
      </Card>
    </AccountShell>
  );
}
