"use client";

import { useActionState, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { requestReturn, type ReturnFormState } from "@/app/[locale]/account/care-actions";
import { computeRefund, OUR_FAULT, RETURN_REASONS, type ReturnReason } from "@/lib/returns";
import type { ReturnableItem } from "@/lib/customer/returns";
import AccountIcon from "./AccountIcon";

type Props = {
  orderNo: string;
  items: ReturnableItem[];
  discount: number;
  deliveryFee: number;
  packagingFee: number;
};

// Which suits, why, refund or exchange, and her promise that the fabric is uncut and clean.
export default function ReturnForm({ orderNo, items, discount, deliveryFee, packagingFee }: Props) {
  const t = useTranslations("Returns");
  const tRack = useTranslations("Rack");
  const locale = useLocale();
  const [state, action, pending] = useActionState<ReturnFormState, FormData>(requestReturn, {});
  const [qty, setQty] = useState<Record<string, number>>(() => Object.fromEntries(items.map((i) => [i.id, items.length === 1 ? i.qty : 0])));
  const [reason, setReason] = useState<ReturnReason | "">("");
  const [resolution, setResolution] = useState<"refund" | "exchange">("refund");
  const price = (n: number) => tRack("price", { amount: n });

  const refund = useMemo(
    () => computeRefund({ items, discount, deliveryFee, packagingFee }, items.map((i) => ({ orderItemId: i.id, qty: qty[i.id] ?? 0 })), reason || "other"),
    [items, discount, deliveryFee, packagingFee, qty, reason],
  );
  const label = "flex flex-col gap-1.5 text-[14px] text-ink";

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="orderNo" value={orderNo} />

      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-2 text-[15px] font-semibold text-emerald">{t("whichSuits")}</legend>
        {items.map((i) => (
          <label key={i.id} className="th-opt items-center justify-between">
            <span className="min-w-0">
              <bdi className="block font-medium">{i.name}</bdi>
              <small dir="ltr" className="text-[12px] text-muted">
                {i.code}
              </small>
            </span>
            <select
              name={`qty_${i.id}`}
              value={qty[i.id] ?? 0}
              onChange={(e) => setQty((q) => ({ ...q, [i.id]: Number(e.target.value) }))}
              aria-label={t("qtyFor", { name: i.name })}
              className="th-field w-auto min-w-[72px] text-[16px]"
            >
              {Array.from({ length: i.qty + 1 }, (_, n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        ))}
      </fieldset>

      <label className={label}>
        <span className="font-semibold text-emerald">{t("reasonLabel")}</span>
        <select name="reason" required value={reason} onChange={(e) => setReason(e.target.value as ReturnReason)} className="th-field text-[16px]">
          <option value="" disabled>
            {t("reasonPick")}
          </option>
          {RETURN_REASONS.map((r) => (
            <option key={r} value={r}>
              {t(`reason.${r}`)}
            </option>
          ))}
        </select>
      </label>

      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-2 text-[15px] font-semibold text-emerald">{t("wantLabel")}</legend>
        {(["refund", "exchange"] as const).map((r) => (
          <label key={r} className="th-opt">
            <input type="radio" name="resolution" value={r} checked={resolution === r} onChange={() => setResolution(r)} />
            <span>
              {t(`resolution.${r}`)}
              <small className="block text-[12px] text-muted">{t(`resolutionHint.${r}`)}</small>
            </span>
          </label>
        ))}
      </fieldset>

      <label className={label}>
        <span className="font-semibold text-emerald">{t("detailsLabel")}</span>
        <textarea name="details" maxLength={600} rows={3} className="th-field text-[16px]" placeholder={t("detailsPlaceholder")} />
      </label>

      <div className="rounded-xl border border-line bg-white px-3.5 py-3 text-[14px]">
        <p className="m-0 flex items-center justify-between gap-3 font-semibold text-emerald">
          <span>{resolution === "refund" ? t("estimateRefund") : t("estimateCredit")}</span>
          <span>{price(refund.total)}</span>
        </p>
        <p className="mb-0 mt-1 text-[12px] text-muted">{reason && OUR_FAULT.includes(reason) ? t("feeRefunded") : t("feeKept")}</p>
      </div>

      <div className="rounded-xl border border-gold/50 bg-[#FBF6EA] px-3.5 py-3 text-[14px]">
        <p className="m-0 flex items-center gap-2 font-semibold text-emerald">
          <AccountIcon name="info" size={18} />
          {t("conditionsTitle")}
        </p>
        <ul className="mb-2 mt-1.5 flex list-disc flex-col gap-1 ps-5">
          <li>{t("condUncut")}</li>
          <li>{t("condClean")}</li>
          <li>{t("condPacked")}</li>
        </ul>
        <label className="flex items-start gap-2.5">
          <input type="checkbox" name="confirm" required className="mt-1" />
          <span>{t("confirm")}</span>
        </label>
      </div>

      {state.error && (
        <p role="alert" className="m-0 text-[14px] text-rani">
          {t(`errors.${state.error}`)}
        </p>
      )}
      <button type="submit" disabled={pending || refund.lines.length === 0} className="th-btn th-btn-pink self-start disabled:opacity-60">
        {pending ? t("sending") : t("send")}
      </button>
      <p className="m-0 text-[12px] text-muted">{t("nextSteps")}</p>
    </form>
  );
}
