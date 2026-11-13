import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AccountShell, { Card } from "@/components/account/AccountShell";
import ProfileForm from "@/components/account/ProfileForm";
import { getAccount } from "@/lib/customer/account";
import { isLocale, safeNextPath } from "@/lib/site-gate";
import { AccountMedal } from "@/components/account/AccountIcon";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false } };

// First visit after signing in with a new email: name, mobile, language, birthday.
export default async function AccountWelcome({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ next?: string }> }) {
  const { locale } = await params;
  const sp = await searchParams;
  const next = sp.next && isLocale(locale) ? safeNextPath(sp.next, locale) : null;
  setRequestLocale(locale);
  const account = await getAccount();
  if (account.state === "guest") redirect(`/${locale}/account/sign-in`);
  if (account.state !== "new") redirect(next ?? `/${locale}/account`);
  const t = await getTranslations("Account");

  return (
    <AccountShell narrow>
      <Card labelledBy="welcome">
        <h1 id="welcome" className="m-0 font-[family-name:var(--font-cormorant)] text-[30px] font-semibold leading-tight text-emerald flex items-center gap-3">
          <AccountMedal name="profile" />
          {t("welcomeTitle")}
        </h1>
        <p className="mb-2 mt-1 text-[14px] text-muted">{t("welcomeIntro")}</p>
        <p className="mb-4 mt-0 rounded-xl bg-[#F4F7F4] px-3 py-2 text-[13px] text-emerald">
          {t.rich("accountFor", { email: account.email || "—", b: (c) => <bdi dir="ltr" className="font-medium">{c}</bdi> })}
        </p>
        <ProfileForm next={next} />
      </Card>
    </AccountShell>
  );
}
