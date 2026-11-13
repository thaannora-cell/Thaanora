import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import AccountShell, { Card } from "@/components/account/AccountShell";
import AccountIcon, { AccountMedal } from "@/components/account/AccountIcon";
import DeactivateForm from "@/components/account/DeactivateForm";
import { getAccount } from "@/lib/customer/account";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Privacy" });
  return { title: `${t("title")} · Thaanora`, robots: { index: false } };
}

// Privacy (PDPL): what we keep, download it all, deactivate the account.
export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const account = await getAccount();
  if (account.state === "guest") redirect(`/${locale}/account/sign-in`);
  if (account.state !== "customer") redirect(`/${locale}/account`);
  const [t, tAcc] = await Promise.all([getTranslations("Privacy"), getTranslations("Account")]);

  return (
    <AccountShell>
      <Link href="/account" className="mb-2 inline-flex min-h-[40px] items-center text-[14px] text-emerald underline underline-offset-2">
        {tAcc("backToAccount")}
      </Link>
      <h1 className="m-0 flex items-center gap-3 font-[family-name:var(--font-cormorant)] text-[32px] font-semibold leading-tight text-emerald md:text-[38px]">
        <AccountMedal name="info" />
        {t("title")}
      </h1>
      <p className="mb-4 mt-1 text-[14px] text-muted">{t("intro")}</p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card labelledBy="keep" className="md:col-span-2">
          <h2 id="keep" className="m-0 flex items-center gap-2 text-[16px] font-semibold text-emerald">
            <AccountIcon name="info" />
            {t("keepTitle")}
          </h2>
          <ul className="m-0 mt-2 flex list-disc flex-col gap-1 ps-5 text-[14px]">
            <li>{t("keepProfile")}</li>
            <li>{t("keepOrders")}</li>
            <li>{t("keepExtras")}</li>
            <li>{t("keepNever")}</li>
          </ul>
        </Card>

        <Card labelledBy="download">
          <h2 id="download" className="m-0 flex items-center gap-2 text-[16px] font-semibold text-emerald">
            <AccountIcon name="claim" />
            {t("downloadTitle")}
          </h2>
          <p className="mb-3 mt-2 text-[14px] text-muted">{t("downloadText")}</p>
          <a href="/api/account/export" download className="th-btn no-underline">
            {t("downloadButton")}
          </a>
        </Card>

        <Card labelledBy="deactivate">
          <h2 id="deactivate" className="m-0 flex items-center gap-2 text-[16px] font-semibold text-emerald">
            <AccountIcon name="profile" />
            {t("deactivateTitle")}
          </h2>
          <p className="mb-1 mt-2 text-[14px]">{t("deactivateText")}</p>
          <ul className="mb-3 mt-1 flex list-disc flex-col gap-1 ps-5 text-[13px] text-muted">
            <li>{t("deactivateRemoves")}</li>
            <li>{t("deactivateKeeps")}</li>
            <li>{t("deactivateBack")}</li>
          </ul>
          <DeactivateForm />
        </Card>
      </div>
    </AccountShell>
  );
}
