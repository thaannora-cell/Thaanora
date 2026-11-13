import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import AccountShell, { Card } from "@/components/account/AccountShell";
import NotificationPrefs from "@/components/account/NotificationPrefs";
import { getAccount } from "@/lib/customer/account";
import { listNotifications, notificationPrefs } from "@/lib/customer/notifications";
import type { NotificationRow } from "@/lib/notifications";
import { markAllRead, openNotification } from "../actions";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Notifications" });
  return { title: `${t("title")} · Thaanora`, robots: { index: false } };
}

// The bell's page: her notifications (newest first) and what she wants to hear about.
export default async function NotificationsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const account = await getAccount();
  if (account.state === "guest") redirect(`/${locale}/account/sign-in`);
  if (account.state !== "customer") redirect(`/${locale}/account`);

  const [t, tAcc, tRack, tCircle, list, prefs] = await Promise.all([
    getTranslations("Notifications"),
    getTranslations("Account"),
    getTranslations("Rack"),
    getTranslations("Circle"),
    listNotifications(),
    notificationPrefs(),
  ]);
  const unread = list.filter((n) => !n.readAt).length;
  const when = (iso: string) =>
    new Intl.DateTimeFormat(`${locale}-u-ca-gregory`, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(iso));

  // The words for each notification, in her language, from the facts stored with it.
  const words = (n: NotificationRow): { title: string; body: string } => {
    const d = n.data;
    switch (n.type) {
      case "order_status": {
        const status = tAcc.has(`status.${d.status}`) ? tAcc(`status.${d.status}`) : d.status;
        return {
          title: t("types.order_status.title", { orderNo: d.orderNo ?? "", status }),
          body: t.has(`orderText.${d.status}`) ? t(`orderText.${d.status}`) : "",
        };
      }
      case "request_update": {
        const kind = t.has(`kinds.${d.kind}`) ? t(`kinds.${d.kind}`) : "";
        const status = t.has(`requestStatus.${d.status}`) ? t(`requestStatus.${d.status}`) : d.status;
        return {
          title: t("types.request_update.title", { kind, status }),
          body: t.has(`requestText.${d.status}`) ? t(`requestText.${d.status}`) : "",
        };
      }
      case "price_drop":
        return { title: t("types.price_drop.title", { name: d.name ?? "", price: d.price ? tRack("price", { amount: Number(d.price) }) : "" }), body: t("types.price_drop.body") };
      case "level_up":
        return { title: t("types.level_up.title", { level: tCircle.has(`levels.${d.level}`) ? tCircle(`levels.${d.level}`) : (d.level ?? "") }), body: t("types.level_up.body") };
      case "birthday_gift":
        return { title: t("types.birthday_gift.title", { pct: d.pct ?? "" }), body: t("types.birthday_gift.body") };
      case "announcement":
      case "new_offer":
        return { title: d[`title_${locale}`] || d.title || t(`types.${n.type}.label`), body: d[`body_${locale}`] || d.body || "" };
      default:
        return { title: t(`types.${n.type}.title`, { name: d.name ?? "", brand: d.brand ?? "", level: d.level ?? "" }), body: t(`types.${n.type}.body`) };
    }
  };

  return (
    <AccountShell>
      <Link href="/account" className="mb-2 inline-flex min-h-[40px] items-center text-[14px] text-emerald underline underline-offset-2">
        {tAcc("backToAccount")}
      </Link>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="m-0 font-[family-name:var(--font-cormorant)] text-[32px] font-semibold leading-tight text-emerald md:text-[38px]">{t("title")}</h1>
          <p className="m-0 text-[14px] text-muted">{t("unread", { count: unread })}</p>
        </div>
        {unread > 0 && (
          <form action={markAllRead.bind(null, locale)}>
            <button type="submit" className="th-btn min-h-[40px] py-1.5 text-[14px]">
              {t("markAll")}
            </button>
          </form>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1.4fr_1fr]">
        <Card labelledBy="list" className="p-2 md:p-3">
          <h2 id="list" className="sr-only">
            {t("title")}
          </h2>
          {list.length === 0 ? (
            <p className="m-0 p-3 text-[14px] text-muted">{t("empty")}</p>
          ) : (
            <ul className="m-0 flex list-none flex-col p-0">
              {list.map((n) => {
                const w = words(n);
                return (
                  <li key={n.id} className="border-b border-line last:border-b-0">
                    <form action={openNotification.bind(null, n.id, locale)}>
                      <button type="submit" className={`flex w-full items-start gap-3 rounded-2xl p-3 text-start transition-colors hover:bg-ivory ${n.readAt ? "" : "bg-[#FBF3E6]"}`}>
                        <span aria-hidden="true" className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${n.readAt ? "bg-transparent" : "bg-rani"}`} />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[15px] font-medium text-emerald">
                            {!n.readAt && <span className="sr-only">{t("new")}: </span>}
                            {w.title}
                          </span>
                          {w.body && <span className="block text-[14px] text-ink">{w.body}</span>}
                          <small className="block text-[12px] text-muted">{when(n.createdAt)}</small>
                        </span>
                      </button>
                    </form>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card labelledBy="prefs">
          <h2 id="prefs" className="m-0 text-[16px] font-semibold text-emerald">
            {t("prefsTitle")}
          </h2>
          <p className="mb-2 mt-1 text-[13px] text-muted">{t.rich("prefsIntro", { phone: `0${account.customer.phone.slice(4)}`, b: (c) => <bdi dir="ltr">{c}</bdi> })}</p>
          <NotificationPrefs prefs={prefs} />
        </Card>
      </div>
    </AccountShell>
  );
}
