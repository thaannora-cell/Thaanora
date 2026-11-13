import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Card } from "./AccountShell";
import AccountIcon from "./AccountIcon";
import ReturnCancel from "./ReturnCancel";
import type { ReturnableOrder } from "@/lib/customer/returns";

const TONE: Record<string, string> = {
  requested: "bg-[#F6EEDC] text-gold-ink",
  approved: "bg-[#E4F1EA] text-emerald",
  received: "bg-[#E4F1EA] text-emerald",
  refunded: "bg-emerald text-ivory-white",
  exchanged: "bg-emerald text-ivory-white",
  rejected: "bg-[#FBEFF3] text-[#7A1238]",
  cancelled: "bg-[#F1EEE8] text-muted",
};

// On her order page: her return and where it stands, or "Return a suit" while the window is open.
export default async function ReturnCard({ order, locale, justSent }: { order: ReturnableOrder; locale: string; justSent: boolean }) {
  if (!order.delivered) return null;
  const [t, tRack] = await Promise.all([getTranslations("Returns"), getTranslations("Rack")]);
  const when = (iso: string) => new Intl.DateTimeFormat(`${locale}-u-ca-gregory`, { day: "numeric", month: "long", hour: "numeric", minute: "2-digit", timeZone: "Asia/Riyadh" }).format(new Date(iso));
  const r = order.existing;
  const showExisting = r && !(order.open && ["rejected", "cancelled"].includes(r.status));

  return (
    <Card labelledBy="return" className="md:col-span-2">
      <h2 id="return" className="m-0 mb-2 flex items-center gap-2 text-[16px] font-semibold text-emerald">
        <AccountIcon name="claim" />
        {t("cardTitle")}
      </h2>
      {justSent && (
        <p role="status" className="m-0 mb-2 rounded-xl border border-[#BFDCCB] bg-[#E7F3EC] px-3 py-2.5 text-[14px] text-[#1d3a2d]">
          {t("sent")}
        </p>
      )}
      {showExisting && r ? (
        <div className="flex flex-col gap-1.5 text-[14px]">
          <p className="m-0 flex flex-wrap items-center gap-2">
            <b dir="ltr" className="font-medium text-emerald">
              {r.returnNo}
            </b>
            <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-medium ${TONE[r.status] ?? ""}`}>{t(`status.${r.status}`)}</span>
          </p>
          <p className="m-0 text-muted">{r.items.map((i) => `${i.name} × ${i.qty}`).join(" · ")}</p>
          <p className="m-0">
            {t(`resolution.${r.resolution}`)} · {r.resolution === "refund" ? t("refundAmount", { amount: tRack("price", { amount: r.refund }) }) : t("creditAmount", { amount: tRack("price", { amount: r.refund }) })}
          </p>
          <p className="m-0 text-[13px] text-muted">{t(`statusText.${r.status}`)}</p>
          {r.status === "requested" && <ReturnCancel orderNo={order.orderNo} />}
        </div>
      ) : order.open ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="m-0 text-[14px] text-muted">{t("openUntil", { until: when(order.windowEnds!) })}</p>
          <Link href={`/account/orders/${order.orderNo}/return`} className="th-btn no-underline">
            {t("start")}
          </Link>
        </div>
      ) : (
        <p className="m-0 text-[14px] text-muted">{order.windowEnds ? t("closed", { until: when(order.windowEnds) }) : ""}</p>
      )}
    </Card>
  );
}
