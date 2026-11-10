"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import type { OrderStatus } from "@/lib/admin/dashboard";
import { setOrderStatus } from "@/app/admin/(panel)/orders/actions";

const ALL: OrderStatus[] = ["waiting_confirmation", "confirmed", "packed", "with_courier", "delivered_cash_collected", "refused_at_door", "cancelled"];
const ENDINGS: OrderStatus[] = ["cancelled", "refused_at_door"];

// The next steps as big buttons; "Change status" for corrections. Cancel / Refused ask once more.
export default function StatusActions({ orderId, status, next, suits }: { orderId: string; status: OrderStatus; next: OrderStatus[]; suits: number }) {
  const t = useTranslations("Admin.orders");
  const tStatus = useTranslations("Admin.status");
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState<OrderStatus | null>(null);
  const [message, setMessage] = useState<{ text: string; bad?: boolean } | null>(null);
  const [other, setOther] = useState<OrderStatus>(status);
  useEffect(() => setOther(status), [status]);

  const go = (to: OrderStatus) => {
    if (ENDINGS.includes(to) && confirming !== to) {
      setConfirming(to);
      return;
    }
    setConfirming(null);
    start(async () => {
      const r = await setOrderStatus(orderId, to);
      setMessage(r.ok ? { text: t("statusSaved", { status: tStatus(to) }) } : { text: t(`errors.${r.error}`, { detail: r.detail ?? "" }), bad: true });
    });
  };

  const held = ["confirmed", "packed", "with_courier", "delivered_cash_collected"].includes(status);
  const hint = (to: OrderStatus) => {
    const willHold = ["confirmed", "packed", "with_courier", "delivered_cash_collected"].includes(to);
    if (willHold && !held) return t("takesStock", { count: suits });
    if (!willHold && held && ENDINGS.includes(to)) return t("returnsStock", { count: suits });
    return null;
  };

  return (
    <div className="flex flex-col gap-3">
      {next.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {next.map((to, i) => {
            const ending = ENDINGS.includes(to);
            return (
              <button
                key={to}
                type="button"
                disabled={pending}
                onClick={() => go(to)}
                className={`inline-flex min-h-[44px] items-center rounded-full border px-4 text-[14px] font-medium disabled:opacity-60 ${
                  i === 0 && !ending ? "border-emerald bg-emerald text-ivory-white" : ending ? "border-rani/40 bg-white text-rani" : "border-[#CFC3AA] bg-white text-emerald"
                }`}
              >
                {confirming === to ? t("confirmEnding", { status: tStatus(to) }) : t("moveTo", { status: tStatus(to) })}
              </button>
            );
          })}
        </div>
      )}
      {next.map((to) => hint(to) && <p key={to} className="m-0 text-[12px] text-muted">{tStatus(to)}: {hint(to)}</p>)}

      <details className="text-[14px]">
        <summary className="min-h-[36px] cursor-pointer py-1.5 text-emerald underline underline-offset-2">{t("changeStatus")}</summary>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <label className="min-w-0 flex-1">
            <span className="sr-only">{t("changeStatus")}</span>
            <select value={other} onChange={(e) => setOther(e.target.value as OrderStatus)} className="min-h-[42px] w-full rounded-xl border border-[#DDD3C0] bg-white px-3 text-[14px]">
              {ALL.map((s) => (
                <option key={s} value={s}>
                  {tStatus(s)}
                </option>
              ))}
            </select>
          </label>
          <button type="button" disabled={pending || other === status} onClick={() => go(other)} className="min-h-[42px] rounded-full border border-[#CFC3AA] bg-white px-4 text-[14px] font-medium text-emerald disabled:opacity-50">
            {confirming === other ? t("confirmEnding", { status: tStatus(other) }) : t("apply")}
          </button>
        </div>
        {hint(other) && other !== status && <p className="m-0 mt-1.5 text-[12px] text-muted">{hint(other)}</p>}
      </details>

      <p role="status" aria-live="polite" className={`m-0 min-h-[20px] text-[14px] ${message?.bad ? "text-rani" : "text-emerald"}`}>
        {pending ? t("saving") : message?.text}
      </p>
    </div>
  );
}
