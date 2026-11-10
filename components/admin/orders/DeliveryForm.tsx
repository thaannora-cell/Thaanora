"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { saveDelivery, type DeliveryState } from "@/app/admin/(panel)/orders/actions";

const field = "min-h-[44px] w-full min-w-0 rounded-xl border border-[#DDD3C0] bg-white px-3 text-[15px] text-ink focus:border-gold focus:outline-none";

export default function DeliveryForm({ orderId, courier, trackingNo, notes, couriers }: { orderId: string; courier: string | null; trackingNo: string | null; notes: string | null; couriers: string[] }) {
  const t = useTranslations("Admin.orders");
  const [state, act, pending] = useActionState<DeliveryState, FormData>(saveDelivery, {});
  const r = state.result;
  return (
    <form action={act} className="flex flex-col gap-3">
      <input type="hidden" name="orderId" value={orderId} />
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <label className="flex min-w-0 flex-col gap-1.5 text-[13px] text-muted">
          {t("courier")}
          <input name="courier" list="th-couriers" defaultValue={courier ?? ""} maxLength={40} className={field} />
          <datalist id="th-couriers">{couriers.map((c) => <option key={c} value={c} />)}</datalist>
        </label>
        <label className="flex min-w-0 flex-col gap-1.5 text-[13px] text-muted">
          {t("trackingNo")}
          <input name="trackingNo" defaultValue={trackingNo ?? ""} maxLength={40} dir="ltr" placeholder="SA48290" className={field} />
        </label>
      </div>
      <label className="flex flex-col gap-1.5 text-[13px] text-muted">
        {t("notes")}
        <textarea name="notes" defaultValue={notes ?? ""} maxLength={1000} rows={3} className={`${field} py-2.5`} />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="min-h-[42px] rounded-full border border-emerald bg-white px-4 text-[14px] font-medium text-emerald disabled:opacity-60">
          {pending ? t("saving") : t("saveDelivery")}
        </button>
        <p role="status" aria-live="polite" className={`m-0 text-[14px] ${r && !r.ok ? "text-rani" : "text-emerald"}`}>
          {r && (r.ok ? t("deliverySaved") : t(`errors.${r.error}`, { detail: "" }))}
        </p>
      </div>
      <small className="text-[12px] text-muted">{t("deliveryHint")}</small>
    </form>
  );
}
