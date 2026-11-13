import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import SectionDenied from "@/components/admin/SectionDenied";
import ReturnActions from "@/components/admin/returns/ReturnActions";
import { RETURN_TONE } from "@/components/admin/returns/tone";
import { getSession } from "@/lib/admin/session";
import { getAdminLang, getAdminT } from "@/lib/admin/i18n";
import { canOpen } from "@/lib/admin/sections";
import { orderTime } from "@/lib/admin/format";
import { getReturn } from "@/lib/admin/returns";

export const dynamic = "force-dynamic";

const panel = "min-w-0 rounded-[18px] border border-[#E1E6DF] bg-white p-[18px] shadow-[0_6px_18px_rgba(14,59,46,0.05)]";
const h2 = "m-0 mb-3 text-[16px] font-semibold text-emerald";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// One return: what she sent back and why, the next step, Zoho credit note, and a WhatsApp message to her.
export default async function ReturnPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (session.state !== "staff") redirect("/admin/sign-in");
  if (!canOpen(session.staff.role, "returns")) return <SectionDenied role={session.staff.role} section="returns" />;
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const r = await getReturn(id);
  if (!r) notFound();
  const [t, lang, tMsg, tRack] = await Promise.all([
    getAdminT(),
    getAdminLang(),
    getTranslations({ locale: r.language, namespace: "ReturnMessage" }),
    getTranslations({ locale: r.language, namespace: "Rack" }),
  ]);
  const sar = (n: number) => t("money", { amount: n });
  const row = (label: string, value: React.ReactNode) => (
    <div className="flex justify-between gap-3 border-b border-[#F0EBE1] py-2 text-[14px] last:border-b-0">
      <dt className="text-muted">{label}</dt>
      <dd className="m-0 min-w-0 text-end">{value}</dd>
    </div>
  );
  // A ready message to her, in her language, for the step she's at.
  const msgKey =
    r.status === "requested" || r.status === "approved"
      ? r.resolution === "refund"
        ? "approvedRefund"
        : "approvedExchange"
      : r.status === "rejected"
        ? "rejected"
        : r.status === "refunded"
          ? "refunded"
          : r.status === "exchanged"
            ? "exchanged"
            : null;
  const message = msgKey ? tMsg(msgKey, { name: r.customer.split(/\s+/)[0] ?? "", returnNo: r.returnNo, orderNo: r.orderNo, amount: tRack("price", { amount: r.refund }) }) : null;
  const wa = message && r.phone ? `https://wa.me/${r.phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}` : null;

  return (
    <>
      <Link href="/admin/returns" className="mb-2 inline-flex min-h-[36px] items-center text-[14px] text-emerald underline underline-offset-2">
        {t("returns.back")}
      </Link>
      <div className="mb-[18px] flex flex-wrap items-center gap-3">
        <h1 className="m-0 font-[family-name:var(--font-cormorant)] text-[28px] font-semibold leading-tight text-emerald md:text-[34px]" dir="ltr">
          {r.returnNo}
        </h1>
        <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-medium ${RETURN_TONE[r.status]}`}>{t(`returns.status.${r.status}`)}</span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className={panel} aria-labelledby="what">
          <h2 id="what" className={h2}>
            {t("returns.whatTitle")}
          </h2>
          <dl className="m-0">
            {row(
              t("returns.order"),
              <Link href={`/admin/orders/${r.orderNo}`} dir="ltr" className="text-emerald underline">
                {r.orderNo}
              </Link>,
            )}
            {row(t("returns.customer"), <bdi>{r.customer}</bdi>)}
            {row(t("returns.phone"), <bdi dir="ltr">{r.phone}</bdi>)}
            {row(t("returns.asked"), orderTime(lang, r.createdAt))}
            {row(t("returns.reasonLabel"), t(`returns.reason.${r.reason}`))}
            {row(t("returns.wants"), t(`returns.resolution.${r.resolution}`))}
            {row(t("returns.refund"), <b className="text-emerald">{sar(r.refund)}</b>)}
            {row(t("returns.deliveryFee"), r.includesDelivery ? t("returns.feeRefunded") : t("returns.feeKept"))}
          </dl>
          <ul className="m-0 mt-3 flex list-none flex-col gap-1 p-0 text-[14px]">
            {r.items.map((i) => (
              <li key={i.code} className="flex justify-between gap-3">
                <span>
                  <bdi>{i.name}</bdi> <small className="text-muted" dir="ltr">{i.code}</small>
                </span>
                <span className="tabular-nums">× {i.qty}</span>
              </li>
            ))}
          </ul>
          {r.details && (
            <p className="mb-0 mt-3 rounded-xl bg-[#FAF8F3] px-3 py-2 text-[14px]">
              <bdi>{r.details}</bdi>
            </p>
          )}
          {r.staffNote && <p className="mb-0 mt-2 text-[13px] text-muted">{t("returns.staffNote", { note: r.staffNote })}</p>}
        </section>

        <section className={panel} aria-labelledby="next">
          <h2 id="next" className={h2}>
            {t("returns.nextTitle")}
          </h2>
          <p className="m-0 mb-3 text-[14px] text-muted">{t(`returns.howTo.${r.status}`)}</p>
          <ReturnActions id={r.id} status={r.status} resolution={r.resolution} refundRecorded={r.refundRecorded} invoiceIssued={r.invoiceIssued} />
          {wa && (
            <a href={wa} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-[44px] items-center rounded-full border border-[#BFDCCB] bg-[#E7F3EC] px-4 text-[14px] font-medium text-emerald no-underline">
              {t("returns.whatsapp")}
            </a>
          )}
        </section>

        <section className={`${panel} lg:col-span-2`} aria-labelledby="zoho">
          <h2 id="zoho" className={h2}>
            {t("returns.zohoTitle")}
          </h2>
          <dl className="m-0">
            {row(t("returns.invoice"), r.invoiceNo ?? t("returns.noInvoice"))}
            {row(t("returns.creditNote"), r.creditNoteNo ?? t(`returns.cn.${r.creditNoteStatus}`))}
            {r.resolution === "refund" && row(t("returns.refundInZoho"), r.refundRecorded ? t("returns.yes") : t("returns.notYet"))}
            {r.resolution === "exchange" && row(t("returns.exchangeOrder"), r.exchangeOrderNo ? `${r.exchangeOrderNo} · ${r.creditApplied ? t("returns.creditApplied") : t("returns.creditWaiting")}` : "—")}
          </dl>
          {r.zohoError && (
            <p role="alert" className="mb-0 mt-3 rounded-xl border border-rani/30 bg-[#FBE7EE] px-3 py-2.5 text-[13px] text-rani">
              {r.zohoError}
            </p>
          )}
        </section>
      </div>
    </>
  );
}
