import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import AccountShell, { Card } from "@/components/account/AccountShell";
import { AccountMedal } from "@/components/account/AccountIcon";
import ReviewForm from "@/components/account/ReviewForm";
import { getAccount } from "@/lib/customer/account";
import { reviewableSuits } from "@/lib/customer/reviews";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Reviews" });
  return { title: `${t("title")} · Thaanora`, robots: { index: false } };
}

const TONE = { pending: "bg-[#F6EEDC] text-gold-ink", published: "bg-[#E4F1EA] text-emerald", hidden: "bg-[#F1EEE8] text-muted" } as const;

// The suits she received, each with her review (stars + text) or a form to write one.
export default async function ReviewsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const account = await getAccount();
  if (account.state === "guest") redirect(`/${locale}/account/sign-in`);
  if (account.state !== "customer") redirect(`/${locale}/account`);
  const [t, tAcc, suits] = await Promise.all([getTranslations("Reviews"), getTranslations("Account"), reviewableSuits(account.customer.id)]);

  return (
    <AccountShell>
      <Link href="/account" className="mb-2 inline-flex min-h-[40px] items-center text-[14px] text-emerald underline underline-offset-2">
        {tAcc("backToAccount")}
      </Link>
      <h1 className="m-0 flex items-center gap-3 font-[family-name:var(--font-cormorant)] text-[32px] font-semibold leading-tight text-emerald md:text-[38px]">
        <AccountMedal name="picks" />
        {t("title")}
      </h1>
      <p className="mb-4 mt-1 text-[14px] text-muted">{t("intro")}</p>

      {suits.length === 0 ? (
        <Card>
          <p className="m-0 text-[14px] text-muted">{t("none")}</p>
        </Card>
      ) : (
        <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-2">
          {suits.map((s) => (
            <li key={s.productId}>
              <Card>
                <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <bdi className="block font-medium text-emerald">{s.name}</bdi>
                    <small dir="ltr" className="text-[12px] text-muted">
                      {s.code} · {s.orderNo}
                    </small>
                  </div>
                  {s.review && <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-medium ${TONE[s.review.status]}`}>{t(`status.${s.review.status}`)}</span>}
                </div>
                <ReviewForm code={s.code} initial={s.review ? { rating: s.review.rating, body: s.review.body } : null} />
                {s.review?.reply && (
                  <p className="mb-0 mt-3 border-s-2 border-gold ps-3 text-[13px] text-muted">
                    <b className="font-medium text-emerald">{t("ourReply")}</b> <bdi>{s.review.reply}</bdi>
                  </p>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
      <p className="mb-0 mt-4 text-[12px] text-muted">{t("rules")}</p>
    </AccountShell>
  );
}
