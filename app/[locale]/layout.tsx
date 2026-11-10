import { NextIntlClientProvider } from "next-intl";
import TrackOrderDialog from "@/components/storefront/TrackOrderDialog";
import SourcingDialog from "@/components/storefront/SourcingDialog";
import { getMessages, getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { fontVars } from "@/lib/fonts";
import "../globals.css";


export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Meta" });
  return { title: t("title"), description: t("description") };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }

  const messages = await getMessages();
  const isRTL = locale === "ar" || locale === "ur";

  return (
    <html
      lang={locale}
      dir={isRTL ? "rtl" : "ltr"}
      className={fontVars}
    >
      <body className="bg-ivory font-[family-name:var(--font-jost)] text-ink antialiased">
        <NextIntlClientProvider messages={messages}>
          {children}
          <TrackOrderDialog />
          <SourcingDialog />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
