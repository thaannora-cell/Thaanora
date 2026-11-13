import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import PageShell from "@/components/storefront/PageShell";
import { AccountMedal } from "@/components/account/AccountIcon";

// "Page not found" in her language, with a way back to the shop (also for suits no longer on sale).
export default async function NotFound() {
  const t = await getTranslations("NotFound");
  return (
    <PageShell>
      <div className="mx-auto flex max-w-[520px] flex-col items-center gap-3 py-10 text-center">
        <AccountMedal name="tailor" size={64} />
        <p className="th-caps m-0 font-[family-name:var(--font-cinzel)] text-[12px] tracking-[0.16em] text-gold-ink">404</p>
        <h1 className="m-0 font-[family-name:var(--font-cormorant)] text-[32px] font-semibold leading-tight text-emerald">{t("title")}</h1>
        <p className="m-0 text-[15px] text-muted">{t("text")}</p>
        <Link href="/" className="th-btn th-btn-pink mt-2 no-underline">
          {t("toShop")}
        </Link>
      </div>
    </PageShell>
  );
}
