import { redirect } from "next/navigation";
import SectionDenied from "@/components/admin/SectionDenied";
import QueueItem from "@/components/admin/notifications/QueueItem";
import ShopNumberNote from "@/components/admin/ShopNumberNote";
import { getSession } from "@/lib/admin/session";
import { getAdminLang, getAdminT } from "@/lib/admin/i18n";
import { canOpen } from "@/lib/admin/sections";
import { orderTime } from "@/lib/admin/format";
import { whatsappQueue } from "@/lib/admin/whatsapp-queue";
import { getWhatsappNumber } from "@/lib/shop-data";

export const dynamic = "force-dynamic";

const panel = "min-w-0 rounded-[18px] border border-[#E1E6DF] bg-white p-[18px] shadow-[0_6px_18px_rgba(14,59,46,0.05)]";

// Notifications, step A2: the WhatsApp messages customers asked for. (The announcement composer and
// alert switches come in a later step.)
export default async function NotificationsPage() {
  const session = await getSession();
  if (session.state !== "staff") redirect("/admin/sign-in");
  if (!canOpen(session.staff.role, "notifications")) return <SectionDenied role={session.staff.role} section="notifications" />;
  const shop = await getWhatsappNumber();
  const [t, lang, { items, failed }] = [await getAdminT(), await getAdminLang(), await whatsappQueue(shop)];

  return (
    <>
      <div className="mb-[18px]">
        <h1 className="m-0 font-[family-name:var(--font-cormorant)] text-[28px] font-semibold leading-tight text-emerald md:text-[34px]">{t("notifications.title")}</h1>
        <p className="m-0 text-[14px] text-muted">{t("notifications.sub")}</p>
      </div>
      {failed && (
        <p role="alert" className="mb-4 rounded-xl border border-rani/30 bg-[#FBE7EE] px-3 py-2.5 text-[14px] text-rani">
          {t("dashboard.loadFailed")}
        </p>
      )}
      <section aria-labelledby="queue" className={panel}>
        <h2 id="queue" className="m-0 mb-1 text-[16px] font-semibold text-emerald">
          {t("notifications.queueTitle", { count: items.length })}
        </h2>
        <p className="m-0 mb-2 text-[13px] text-muted">{t("notifications.queueHint")}</p>
        {items.length === 0 ? (
          <p className="m-0 py-3 text-[14px] text-muted">{t("notifications.empty")}</p>
        ) : (
          <ul className="m-0 list-none p-0">
            {items.map((item) => (
              <QueueItem key={item.id} item={item} when={orderTime(lang, item.createdAt)} />
            ))}
          </ul>
        )}
        <ShopNumberNote number={shop} />
      </section>
    </>
  );
}
