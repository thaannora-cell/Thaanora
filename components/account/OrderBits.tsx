import { getTranslations } from "next-intl/server";

const TONE: Record<string, string> = {
  delivered_cash_collected: "bg-[#E4F1EA] text-emerald",
  cancelled: "bg-[#F1EEE8] text-muted",
  refused_at_door: "bg-[#FBEFF3] text-[#7A1238]",
};

// The order's status as a small badge, in her language.
export async function OrderStatusChip({ status }: { status: string }) {
  const t = await getTranslations("Account");
  return (
    <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12px] font-medium ${TONE[status] ?? "bg-[#F6EEDC] text-gold-ink"}`}>
      {t.has(`status.${status}`) ? t(`status.${status}`) : status}
    </span>
  );
}

const STEPS = ["waiting_confirmation", "confirmed", "packed", "with_courier", "delivered_cash_collected"] as const;

// The same five steps as "Track my order", with the date of the latest change on the current step.
export async function OrderTimeline({
  status,
  placedAt,
  changedAt,
  courier,
  trackingNo,
  locale,
}: {
  status: string;
  placedAt: string;
  changedAt: string;
  courier: string | null;
  trackingNo: string | null;
  locale: string;
}) {
  const t = await getTranslations("Track");
  const date = (iso: string) =>
    new Intl.DateTimeFormat(`${locale}-u-ca-gregory`, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(iso));

  if (status === "cancelled" || status === "refused_at_door") {
    return (
      <p className="m-0 rounded-xl border border-[#F0C3D3] bg-[#FBEFF3] px-3 py-2.5 text-[14px] text-[#7A1238]">
        {t(status === "cancelled" ? "cancelled" : "refused", { date: date(changedAt) })}
      </p>
    );
  }
  const current = STEPS.indexOf(status as (typeof STEPS)[number]);
  const delivered = status === "delivered_cash_collected";
  return (
    <ol className="th-track m-0 list-none p-0">
      {STEPS.map((s, i) => {
        const state = delivered || i < current ? "done" : i === current ? "now" : "todo";
        return (
          <li key={s} className={`th-track-${state}`} aria-current={state === "now" ? "step" : undefined}>
            <b className="block font-medium text-emerald">{t(`step_${s}`)}</b>
            <span>
              {s === "with_courier" && (courier || trackingNo)
                ? t("courierLine", { courier: courier ?? "—", tracking: trackingNo ?? "—" })
                : t(`step_${s}_text`)}
            </span>
            {i === 0 && <small className="block text-[12px]">{date(placedAt)}</small>}
            {i === current && i > 0 && <small className="block text-[12px]">{date(changedAt)}</small>}
          </li>
        );
      })}
    </ol>
  );
}
