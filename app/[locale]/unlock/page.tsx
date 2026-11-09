import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { routing, type Locale } from "@/i18n/routing";
import { safeNextPath } from "@/lib/site-gate";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Thaanora", robots: { index: false, follow: false } };

const LANG_LABELS: Record<Locale, string> = { en: "EN", ar: "عربي", ur: "اردو", hi: "हिं" };

export default async function UnlockPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { locale } = await params;
  const { next: rawNext, error } = await searchParams;
  const next = safeNextPath(rawNext, locale);
  const t = await getTranslations("Unlock");

  return (
    <main className="min-h-dvh bg-emerald flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-[400px] rounded-3xl bg-ivory-white p-7 shadow-[0_24px_60px_rgba(0,0,0,0.35)] border border-gold/40">
        <div className="flex flex-col items-center text-center gap-2">
          <span className="th-medal mt-3" aria-hidden="true">T</span>
          <p className="font-[family-name:var(--font-cinzel)] font-semibold tracking-[0.18em] text-[18px] text-emerald mt-1">
            THAANORA
          </p>
          <p className="font-[family-name:var(--font-amiri)] text-[15px] text-gold-ink" lang="ar" dir="rtl">
            قماشكِ… على مقاسكِ
          </p>
          <h1 className="font-[family-name:var(--font-cormorant)] text-[28px] font-semibold text-emerald leading-tight mt-3">
            {t("title")}
          </h1>
          <p className="text-[14px] text-muted">{t("subtitle")}</p>
        </div>

        <form method="post" action="/api/unlock" className="mt-6 flex flex-col gap-3">
          <input type="hidden" name="next" value={next} />
          <input type="hidden" name="locale" value={locale} />
          <label htmlFor="site-password" className="text-[13px] text-muted">
            {t("label")}
          </label>
          <input
            id="site-password"
            name="password"
            type="password"
            required
            autoFocus
            autoComplete="current-password"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "unlock-error" : undefined}
            className="min-h-[46px] rounded-full border border-line bg-white px-4 text-[15px] text-ink focus:outline-none focus:border-gold"
          />
          {error && (
            <p id="unlock-error" role="alert" className="text-[13px] text-rani">
              {t("wrong")}
            </p>
          )}
          <button
            type="submit"
            className="min-h-[48px] rounded-full bg-rani text-white font-medium text-[15px] hover:-translate-y-0.5 transition-transform"
          >
            {t("button")}
          </button>
        </form>

        <nav aria-label="Language" className="mt-6 flex justify-center gap-4 text-[13px]">
          {routing.locales.map((l) => (
            <a
              key={l}
              href={`/${l}/unlock?next=${encodeURIComponent(next.replace(/^\/[a-z]{2}(?=\/|$)/, `/${l}`))}`}
              lang={l}
              aria-current={l === locale ? "true" : undefined}
              className="text-emerald no-underline aria-[current]:font-semibold aria-[current]:underline underline-offset-4"
            >
              {LANG_LABELS[l]}
            </a>
          ))}
        </nav>
      </div>
    </main>
  );
}
