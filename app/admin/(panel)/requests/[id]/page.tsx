import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import SectionDenied from "@/components/admin/SectionDenied";
import ReqStatusChip from "@/components/admin/requests/ReqStatusChip";
import RequestStatus from "@/components/admin/requests/RequestStatus";
import { getSession } from "@/lib/admin/session";
import { getAdminLang, getAdminT } from "@/lib/admin/i18n";
import { canOpen } from "@/lib/admin/sections";
import { getRequest, requestReply } from "@/lib/admin/requests";
import { areaKey, orderTime } from "@/lib/admin/format";
import { getWhatsappNumber } from "@/lib/shop-data";
import { templateFor } from "@/lib/admin/wa-templates";
import { displayNumber } from "@/lib/wa-templates";
import { getTranslations } from "next-intl/server";
import ShopNumberNote from "@/components/admin/ShopNumberNote";
import QuoteMessage from "@/components/admin/requests/QuoteMessage";

export const dynamic = "force-dynamic";

const panel = "min-w-0 rounded-[18px] border border-[#E1E6DF] bg-white p-[18px] shadow-[0_6px_18px_rgba(14,59,46,0.05)]";
const h2 = "m-0 mb-3 text-[16px] font-semibold text-emerald";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function RequestPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (session.state !== "staff") redirect("/admin/sign-in");
  if (!canOpen(session.staff.role, "requests")) return <SectionDenied role={session.staff.role} section="requests" />;
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const r = await getRequest(id);
  if (!r) notFound();
  const [t, lang, reply, shop] = [await getAdminT(), await getAdminLang(), await requestReply(r), await getWhatsappNumber()];
  // Sourcing requests that are still open get a price quote from the owner's template.
  const quote =
    reply && r.type === "sourcing" && r.status !== "closed"
      ? {
          template: await templateFor("sourcingQuote", r.language),
          pricePattern: String((await getTranslations({ locale: r.language, namespace: "Rack" })).raw("price")),
        }
      : null;
  const k = r.area ? areaKey(r.area) : null;
  const row = (label: string, value: React.ReactNode) => (
    <div className="flex justify-between gap-3 border-b border-[#F0EBE1] py-2 text-[14px] last:border-b-0">
      <dt className="text-muted">{label}</dt>
      <dd className="m-0 min-w-0 text-end">{value}</dd>
    </div>
  );
  // Only links that are plain http(s) are made clickable; the text came from a customer.
  const safeLink = r.link && /^https?:\/\/\S+$/i.test(r.link) ? r.link : null;

  return (
    <>
      <Link href="/admin/requests" className="mb-2 inline-flex min-h-[36px] items-center text-[14px] text-emerald underline underline-offset-2">
        {t("requests.back")}
      </Link>
      <div className="mb-[18px] flex flex-wrap items-center gap-3">
        <h1 className="m-0 font-[family-name:var(--font-cormorant)] text-[28px] font-semibold leading-tight text-emerald md:text-[34px]">
          {t(`requests.type.${r.type}`)} · <span dir="ltr">{r.ref}</span>
        </h1>
        <ReqStatusChip status={r.status} label={t(`requests.status.${r.status}`)} />
        <p className="m-0 w-full text-[14px] text-muted">{t("requests.received", { time: orderTime(lang, r.createdAt) })}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_1fr]">
        <div className="flex min-w-0 flex-col gap-4">
          <section aria-labelledby="what" className={panel}>
            <h2 id="what" className={h2}>
              {t("requests.whatTitle")}
            </h2>
            <dl className="m-0">
              {row(t("requests.colRequest"), <bdi>{r.what}</bdi>)}
              {r.brand && r.brand !== r.what && row(t("requests.brand"), <bdi>{r.brand}</bdi>)}
              {r.quantity && row(t("requests.quantity"), r.quantity)}
              {r.link &&
                row(
                  t("requests.link"),
                  safeLink ? (
                    <a href={safeLink} target="_blank" rel="noopener noreferrer nofollow" className="break-all text-emerald underline" dir="ltr">
                      {safeLink}
                    </a>
                  ) : (
                    <bdi className="break-all" dir="ltr">
                      {r.link}
                    </bdi>
                  ),
                )}
            </dl>
            {r.screenshotUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- a short-lived private link; next/image would cache it
              <img src={r.screenshotUrl} alt={t("requests.screenshot")} className="mt-3 max-h-[420px] w-auto max-w-full rounded-xl border border-[#E7E1D4]" />
            )}
          </section>

          <section aria-labelledby="st" className={panel}>
            <h2 id="st" className={h2}>
              {t("requests.colStatus")}
            </h2>
            <RequestStatus id={r.id} status={r.status} />
          </section>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <section aria-labelledby="who" className={panel}>
            <h2 id="who" className={h2}>
              {t("requests.customerTitle")}
            </h2>
            <dl className="m-0">
              {row(t("requests.name"), <bdi>{r.customer}</bdi>)}
              {row(t("requests.phone"), <bdi dir="ltr">{r.phone}</bdi>)}
              {r.area && row(t("requests.area"), k ? t(`areas.${k}`) : <bdi>{r.area}</bdi>)}
              {row(t("requests.language"), t(`orders.lang.${r.language}`))}
            </dl>
          </section>

          <section aria-labelledby="reply" className={panel}>
            <h2 id="reply" className={h2}>
              {t("requests.replyTitle")}
            </h2>
            {reply ? (
              <>
                <pre className="m-0 mb-3 whitespace-pre-wrap rounded-xl bg-[#F4F7F4] p-3 font-[family-name:var(--font-jost)] text-[13px] text-ink" dir="auto">
                  {reply.text}
                </pre>
                <a href={reply.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center rounded-full bg-rani px-5 text-[15px] font-medium text-white no-underline">
                  {t(`requests.reply.${reply.kind}`)}
                </a>
                <p className="m-0 mt-2 text-[12px] text-muted">{t("orders.messageHint")}</p>
                <ShopNumberNote number={shop} />
              </>
            ) : (
              <p className="m-0 text-[14px] text-muted">{t("orders.noPhone")}</p>
            )}
          </section>

          {reply && quote && (
            <section aria-labelledby="quote" className={panel}>
              <h2 id="quote" className={h2}>
                {t("requests.quoteTitle")} <small className="font-normal text-muted">· {t(`orders.lang.${r.language}`)}</small>
              </h2>
              <QuoteMessage
                template={quote.template}
                pricePattern={quote.pricePattern}
                values={{ ...reply.values, shopNumber: shop ? displayNumber(shop) : "" }}
                phone={reply.phone}
                locale={r.language}
              />
              <ShopNumberNote number={shop} />
            </section>
          )}
        </div>
      </div>
    </>
  );
}
