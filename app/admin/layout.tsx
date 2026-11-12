import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { fontVars } from "@/lib/fonts";
import { adminMessages, getAdminLang, getAdminT } from "@/lib/admin/i18n";
import "../globals.css";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getAdminT();
  // proxy.ts also sends X-Robots-Tag: noindex for every /admin address.
  return { title: t("title"), robots: { index: false, follow: false, nocache: true } };
}

export default async function AdminRootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getAdminLang();
  return (
    <html lang={lang} dir={lang === "ar" ? "rtl" : "ltr"} className={fontVars}>
      <body className="th-admin bg-[#EEF1EC] font-[family-name:var(--font-jost)] text-ink antialiased">
        <NextIntlClientProvider locale={lang} messages={adminMessages(lang)}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
