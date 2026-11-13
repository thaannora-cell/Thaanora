import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import AccountShell, { Card } from "@/components/account/AccountShell";
import ClaimOrder from "@/components/account/ClaimOrder";
import { getAccount } from "@/lib/customer/account";
import { myOrders } from "@/lib/customer/orders";
import { unreadCount } from "@/lib/customer/notifications";
import { customerSignOut } from "./actions";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ welcome?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Account" });
  return { title: `${t("title")} · Thaanora`, robots: { index: false } };
}

const LANG_NAMES = { en: "English", ar: "العربية", ur: "اردو", hi: "हिन्दी" } as const;
const STATUS_TONE: Record<string, string> = {
  delivered_cash_collected: "bg-[#E4F1EA] text-emerald",
  cancelled: "bg-[#F1EEE8] text-muted",
  refused_at_door: "bg-[#FBEFF3] text-[#7A1238]",
};

// My Thaanora overview: greeting, her details, latest order, adding earlier guest orders.
export default async function AccountHome({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const account = await getAccount();
  if (account.state === "guest") redirect(`/${locale}/account/sign-in`);
  if (account.state === "new") redirect(`/${locale}/account/welcome`);
  const [t, tRack, sp] = [await getTranslations("Account"), await getTranslations("Rack"), await searchParams];
  const signOut = customerSignOut.bind(null, locale);
  const signOutButton = (
    <form action={signOut}>
      <button type="submit" className="min-h-[40px] text-[14px] text-emerald underline underline-offset-2">
        {t("signOut")}
      </button>
    </form>
  );

  if (account.state === "deactivated") {
    return (
      <AccountShell narrow>
        <Card>
          <p className="m-0 text-[15px]">{t("deactivated")}</p>
          <div className="mt-3">{signOutButton}</div>
        </Card>
      </AccountShell>
    );
  }

  const c = account.customer;
  const [[latest], unread] = await Promise.all([myOrders(c.id, 1), unreadCount()]);
  const date = (iso: string) => new Intl.DateTimeFormat(`${locale}-u-ca-gregory`, { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
  const birthday = c.birthday ? new Intl.DateTimeFormat(`${locale}-u-ca-gregory`, { day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${c.birthday}T00:00:00Z`)) : null;
  const row = (label: string, value: React.ReactNode) => (
    <div className="flex justify-between gap-3 border-b border-line py-2.5 text-[14px] last:border-b-0">
      <dt className="text-muted">{label}</dt>
      <dd className="m-0 min-w-0 text-end">{value}</dd>
    </div>
  );

  return (
    <AccountShell>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="m-0 font-[family-name:var(--font-cinzel)] text-[12px] tracking-[0.16em] text-gold-ink">{t("title")}</p>
          <h1 className="m-0 font-[family-name:var(--font-cormorant)] text-[32px] font-semibold leading-tight text-emerald md:text-[38px]">
            {t("hello", { name: c.name.split(/\s+/)[0] })}
          </h1>
          <p className="m-0 text-[14px] text-muted">{sp.welcome ? t("welcomeDone") : t("overviewIntro")}</p>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/account/notifications" className="min-h-[40px] text-[14px] font-medium text-emerald underline underline-offset-2">
            {t("notificationsLink", { count: unread })}
          </Link>
          {signOutButton}
        </div>
      </div>

      <nav aria-label={t("quickLinks")} className="mb-4 flex flex-wrap gap-2">
        {([
          ["/account/orders", t("allOrders")],
          ["/account/favourites", t("favouritesLink")],
          ["/account/addresses", t("addressesLink")],
          ["/account/tailor", t("tailorLink")],
          ["/account/notifications", t("notificationsLink", { count: unread })],
        ] as const).map(([href, label]) => (
          <Link key={href} href={href} className="th-pill inline-flex min-h-[40px] items-center rounded-full border border-line bg-ivory-white px-4 text-[14px] text-emerald no-underline hover:border-gold">
            {label}
          </Link>
        ))}
      </nav>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card labelledBy="latest">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 id="latest" className="m-0 text-[16px] font-semibold text-emerald">
              {t("latestTitle")}
            </h2>
            {latest && (
              <Link href="/account/orders" className="min-h-[36px] text-[14px] text-emerald underline underline-offset-2">
                {t("allOrders")}
              </Link>
            )}
          </div>
          {latest ? (
            <div className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/account/orders/${latest.orderNo}`} dir="ltr" className="font-medium text-emerald underline underline-offset-2">
                  {latest.orderNo}
                </Link>
                <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-medium ${STATUS_TONE[latest.status] ?? "bg-[#F6EEDC] text-gold-ink"}`}>
                  {t(`status.${latest.status}`)}
                </span>
              </div>
              <p className="m-0 text-[14px] text-muted">
                {t("orderLine", { suits: latest.suits, total: tRack("price", { amount: latest.total }), date: date(latest.createdAt) })}
              </p>
            </div>
          ) : (
            <p className="m-0 text-[14px] text-muted">{t("noOrders")}</p>
          )}
        </Card>

        <Card labelledBy="details">
          <div className="mb-1 flex items-center justify-between gap-2">
            <h2 id="details" className="m-0 text-[16px] font-semibold text-emerald">
              {t("detailsTitle")}
            </h2>
            <Link href="/account/profile" className="min-h-[36px] text-[14px] text-emerald underline underline-offset-2">
              {t("edit")}
            </Link>
          </div>
          <dl className="m-0">
            {row(t("name"), <bdi>{c.name}</bdi>)}
            {row(t("phone"), <bdi dir="ltr">{`0${c.phone.slice(4)}`}</bdi>)}
            {row(t("language"), <span lang={c.language}>{LANG_NAMES[c.language]}</span>)}
            {row(t("birthdayShort"), birthday ?? <span className="text-muted">{t("noBirthday")}</span>)}
          </dl>
        </Card>

        <Card labelledBy="claim" className="md:col-span-2">
          <h2 id="claim" className="m-0 text-[16px] font-semibold text-emerald">
            {t("claimTitle")}
          </h2>
          <p className="mb-3 mt-1 text-[14px] text-muted">{t("claimIntro")}</p>
          <ClaimOrder />
        </Card>
      </div>

      <p className="mb-0 mt-5 text-center text-[13px] text-muted">{t("comingSoon")}</p>
    </AccountShell>
  );
}
