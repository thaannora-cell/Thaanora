import { NextIntlClientProvider } from "next-intl";
import TrackOrderDialog from "@/components/storefront/TrackOrderDialog";
import SourcingDialog from "@/components/storefront/SourcingDialog";
import { getWhatsappNumber } from "@/lib/shop-data";
import { getMessages, getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { fontVars } from "@/lib/fonts";
import { OG_LOCALE, languageLinks, siteUrl, isPrivatePreview } from "@/lib/seo";
import "../globals.css";


export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Meta" });
  // Shared by every page in this language; pages add their own title, description and links.
  return {
    metadataBase: new URL(siteUrl()),
    title: t("title"),
    description: t("description"),
    applicationName: "Thaanora",
    alternates: languageLinks(locale, ""),
    openGraph: { type: "website", siteName: "Thaanora · ثانورا", title: t("title"), description: t("description"), locale: OG_LOCALE[locale], url: `/${locale}` },
    twitter: { card: "summary_large_image", title: t("title"), description: t("description") },
    robots: isPrivatePreview() ? { index: false, follow: false } : undefined,
    formatDetection: { telephone: false },
  };
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

  const [messages, whatsapp] = await Promise.all([getMessages(), getWhatsappNumber()]);
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
          <TrackOrderDialog whatsapp={whatsapp} />
          <SourcingDialog />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
