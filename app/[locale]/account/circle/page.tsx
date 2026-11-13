import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import AccountShell, { Card } from "@/components/account/AccountShell";
import CircleStatus from "@/components/account/CircleStatus";
import { getAccount } from "@/lib/customer/account";
import { getPerks, myDiscountHistory } from "@/lib/customer/perks";
import { getLiveCampaigns } from "@/lib/campaigns";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Circle" });
  return { title: `${t("pageTitle")} · Thaanora`, robots: { index: false } };
}

// Thaanora Circle and My offers: her level and benefits, every level, her birthday gift, personal
// offers, offers for everyone, and the discounts she has had.
export default async function CirclePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const account = await getAccount();
  if (account.state === "guest") redirect(`/${locale}/account/sign-in`);
  if (account.state !== "customer") redirect(`/${locale}/account`);
  const c = account.customer;

  const [t, tAcc, tRack, perks, history, campaigns] = await Promise.all([
    getTranslations("Circle"),
    getTranslations("Account"),
    getTranslations("Rack"),
    getPerks(c.id, c.birthday),
    myDiscountHistory(c.id),
    getLiveCampaigns(),
  ]);
  const name = (slug: string) => (t.has(`levels.${slug}`) ? t(`levels.${slug}`) : slug);
  const day = (d: string) => new Intl.DateTimeFormat(`${locale}-u-ca-gregory`, { day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${d.slice(0, 10)}T00:00:00Z`));
  const dayYear = (iso: string) => new Intl.DateTimeFormat(`${locale}-u-ca-gregory`, { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Riyadh" }).format(new Date(iso));
  const benefits = (l: { pct: number; freeGiftBox: boolean; perks: string[] }) => [
    ...(l.pct > 0 ? [t("benefit.pct", { pct: l.pct })] : []),
    ...(l.freeGiftBox ? [t("benefit.giftBox")] : []),
    ...l.perks.map((p) => t(`benefit.${p}`)),
  ];
  const b = perks.birthday;
  const usedLabel = (u: (typeof history)[number]) =>
    u.kind === "loyalty"
      ? t("used.loyalty", { level: u.level ? name(u.level) : "", pct: u.pct ?? 0 })
      : u.kind === "code"
        ? t("used.code", { code: u.code ?? "" })
        : t(`used.${u.kind}`, { pct: u.pct ?? 0 });

  return (
    <AccountShell>
      <Link href="/account" className="mb-2 inline-flex min-h-[40px] items-center text-[14px] text-emerald underline underline-offset-2">
        {tAcc("backToAccount")}
      </Link>
      <div className="mb-4">
        <p className="m-0 font-[family-name:var(--font-cinzel)] text-[12px] tracking-[0.16em] text-gold-ink">{t("eyebrow")}</p>
        <h1 className="m-0 font-[family-name:var(--font-cormorant)] text-[32px] font-semibold leading-tight text-emerald md:text-[38px]">{t("pageTitle")}</h1>
        <p className="m-0 text-[14px] text-muted">{t("intro")}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card labelledBy="my-level">
          <h2 id="my-level" className="m-0 mb-3 text-[16px] font-semibold text-emerald">
            {t("myLevel")}
          </h2>
          <CircleStatus perks={perks} />
          {perks.current && (
            <ul className="m-0 mt-4 flex list-none flex-col gap-1.5 p-0 text-[14px]">
              {benefits(perks.current).map((x) => (
                <li key={x} className="flex gap-2">
                  <span aria-hidden="true" className="text-gold">✦</span>
                  {x}
                </li>
              ))}
            </ul>
          )}
        </Card>

        {b && (
          <Card labelledBy="birthday">
            <h2 id="birthday" className="m-0 text-[16px] font-semibold text-emerald">
              {t("birthdayTitle")}
            </h2>
            {b.open && !b.used ? (
              <p className="m-0 mt-2 rounded-xl border border-rani/30 bg-[#FBEFF3] px-3 py-2.5 text-[14px] text-[#7A1238]">
                {t("birthdayReady", { pct: b.pct, end: day(b.end) })}
              </p>
            ) : (
              <p className="m-0 mt-2 text-[14px]">{b.used ? t("birthdayUsed", { date: day(b.date) }) : t("birthdayWindow", { pct: b.pct, start: day(b.start), end: day(b.end) })}</p>
            )}
            <p className="m-0 mt-2 text-[12px] text-muted">{t("birthdayRule")}</p>
          </Card>
        )}
        {!c.birthday && (
          <Card labelledBy="birthday">
            <h2 id="birthday" className="m-0 text-[16px] font-semibold text-emerald">
              {t("birthdayTitle")}
            </h2>
            <p className="m-0 mt-2 text-[14px]">{t("birthdayAdd")}</p>
            <Link href="/account/profile" className="mt-2 inline-flex min-h-[40px] items-center text-[14px] font-medium text-emerald underline underline-offset-2">
              {t("birthdayAddLink")}
            </Link>
          </Card>
        )}

        <Card labelledBy="offers">
          <h2 id="offers" className="m-0 text-[16px] font-semibold text-emerald">
            {t("offersTitle")}
          </h2>
          {perks.offers.length ? (
            <ul className="m-0 mt-2 flex list-none flex-col gap-2 p-0">
              {perks.offers.map((o) => (
                <li key={o.id} className="flex items-start justify-between gap-3 rounded-xl border border-line bg-white px-3 py-2.5 text-[14px]">
                  <span className="min-w-0">
                    <bdi className="block font-medium text-ink">{o.title[locale] || o.title.en || t("offerDefault")}</bdi>
                    <small className="text-[12px] text-muted">{o.endsAt ? t("until", { date: dayYear(o.endsAt) }) : t("noEnd")}</small>
                  </span>
                  <b className="shrink-0 text-rani">{t("pctOff", { pct: o.pct })}</b>
                </li>
              ))}
            </ul>
          ) : (
            <p className="m-0 mt-2 text-[14px] text-muted">{t("noOffers")}</p>
          )}
          {campaigns.length > 0 && (
            <>
              <h3 className="m-0 mt-4 text-[14px] font-semibold text-emerald">{t("everyoneTitle")}</h3>
              <ul className="m-0 mt-2 flex list-none flex-col gap-1.5 p-0 text-[14px]">
                {campaigns.map((x, i) => (
                  <li key={i} className="flex justify-between gap-3">
                    <bdi className="min-w-0">{x.title[locale] || x.title.en || t("offerDefault")}</bdi>
                    <span className="shrink-0 text-muted">
                      {t("pctOff", { pct: x.percent })}
                      {x.endsAt ? ` · ${t("until", { date: dayYear(x.endsAt) })}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>

        <Card labelledBy="how">
          <h2 id="how" className="m-0 text-[16px] font-semibold text-emerald">
            {t("howTitle")}
          </h2>
          <ul className="m-0 mt-2 flex list-disc flex-col gap-1.5 ps-5 text-[14px]">
            <li>{t("howOne")}</li>
            <li>{t("howSale")}</li>
            <li>{t("howCount")}</li>
          </ul>
        </Card>

        <Card labelledBy="levels" className="md:col-span-2">
          <h2 id="levels" className="m-0 text-[16px] font-semibold text-emerald">
            {t("levelsTitle")}
          </h2>
          <ul className="m-0 mt-3 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-3">
            {perks.levels.map((l) => {
              const mine = perks.current?.slug === l.slug;
              return (
                <li key={l.slug} className={`rounded-[16px] border p-4 ${mine ? "border-gold bg-emerald text-ivory-white" : "border-line bg-white"}`}>
                  <p className={`m-0 font-[family-name:var(--font-cormorant)] text-[22px] font-semibold ${mine ? "text-gold-light" : "text-emerald"}`}>
                    {name(l.slug)}
                    {mine && <span className="ms-2 align-middle font-[family-name:var(--font-jost)] text-[12px] font-normal">{t("yourLevel")}</span>}
                  </p>
                  <p className={`m-0 text-[13px] ${mine ? "text-ivory-white/80" : "text-muted"}`}>{t("fromSuits", { count: l.minSuits })}</p>
                  <ul className="m-0 mt-2 flex list-none flex-col gap-1 p-0 text-[14px]">
                    {benefits(l).map((x) => (
                      <li key={x}>✦ {x}</li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
        </Card>

        {history.length > 0 && (
          <Card labelledBy="history" className="md:col-span-2">
            <h2 id="history" className="m-0 text-[16px] font-semibold text-emerald">
              {t("historyTitle")}
            </h2>
            <ul className="m-0 mt-2 flex list-none flex-col p-0">
              {history.map((u) => (
                <li key={u.orderNo} className="flex flex-wrap items-center justify-between gap-2 border-b border-line py-2.5 text-[14px] last:border-b-0">
                  <span className="min-w-0">
                    <Link href={`/account/orders/${u.orderNo}`} dir="ltr" className="font-medium text-emerald underline underline-offset-2">
                      {u.orderNo}
                    </Link>{" "}
                    · {usedLabel(u)}
                  </span>
                  <span className="text-muted">
                    {t("saved", { amount: tRack("price", { amount: u.amount }) })} · {dayYear(u.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </AccountShell>
  );
}
