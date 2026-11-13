"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { exchangeReturn, refundReturn, retryRefundRecord, setReturnStatus, type ReturnActionResult } from "@/app/admin/(panel)/returns/actions";
import type { ReturnStatus } from "@/lib/returns";

type Props = { id: string; status: ReturnStatus; resolution: "refund" | "exchange"; refundRecorded: boolean; invoiceIssued: boolean };

const btn = "min-h-[44px] rounded-full px-5 text-[14px] font-medium disabled:opacity-60";
const primary = `${btn} bg-emerald text-white`;
const pink = `${btn} bg-rani text-white`;
const ghost = `${btn} border border-[#CFC3AA] bg-white text-emerald`;

// The next step for a return, one or two buttons at a time.
export default function ReturnActions({ id, status, resolution, refundRecorded, invoiceIssued }: Props) {
  const t = useTranslations("Admin.returns");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [note, setNote] = useState("");
  const [orderNo, setOrderNo] = useState("");
  const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null);

  const run = (fn: () => Promise<ReturnActionResult>, done: string) =>
    start(async () => {
      const r = await fn();
      setMsg(r.ok ? { text: done } : { text: r.message ? `${t(`errors.${r.error}`)} ${r.message}` : t(`errors.${r.error}`), bad: true });
      router.refresh();
    });

  return (
    <div className="flex flex-col gap-3">
      {(status === "requested" || status === "approved") && (
        <label className="flex flex-col gap-1.5 text-[13px] text-muted">
          {t("noteLabel")}
          <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={600} rows={2} className="th-field text-[15px]" placeholder={t("notePlaceholder")} />
        </label>
      )}
      <div className="flex flex-wrap gap-2">
        {status === "requested" && (
          <>
            <button type="button" disabled={pending} className={primary} onClick={() => run(() => setReturnStatus(id, "approved", note), t("done.approved"))}>
              {t("approve")}
            </button>
            <button type="button" disabled={pending} className={ghost} onClick={() => run(() => setReturnStatus(id, "rejected", note), t("done.rejected"))}>
              {t("reject")}
            </button>
          </>
        )}
        {status === "approved" && (
          <>
            <button type="button" disabled={pending} className={primary} onClick={() => run(() => setReturnStatus(id, "received", note), t("done.received"))}>
              {t("markReceived")}
            </button>
            <button type="button" disabled={pending} className={ghost} onClick={() => run(() => setReturnStatus(id, "cancelled", note), t("done.cancelled"))}>
              {t("cancel")}
            </button>
          </>
        )}
        {status === "received" && resolution === "refund" && (
          <button
            type="button"
            disabled={pending || !invoiceIssued}
            className={pink}
            onClick={() => {
              if (window.confirm(t("refundConfirm"))) run(() => refundReturn(id), t("done.refunded"));
            }}
          >
            {t("refundSent")}
          </button>
        )}
        {status === "received" && resolution === "exchange" && (
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1.5 text-[13px] text-muted">
              {t("exchangeOrderLabel")}
              <input value={orderNo} onChange={(e) => setOrderNo(e.target.value)} placeholder="TH-1234" dir="ltr" className="th-field w-[160px] text-[15px] uppercase" />
            </label>
            <button type="button" disabled={pending || !invoiceIssued || !orderNo.trim()} className={pink} onClick={() => run(() => exchangeReturn(id, orderNo), t("done.exchanged"))}>
              {t("exchangeDone")}
            </button>
          </div>
        )}
        {status === "refunded" && !refundRecorded && (
          <button type="button" disabled={pending} className={ghost} onClick={() => run(() => retryRefundRecord(id), t("done.refundRecorded"))}>
            {t("retryRefund")}
          </button>
        )}
      </div>
      {status === "received" && !invoiceIssued && <p className="m-0 text-[13px] text-rani">{t("needsInvoice")}</p>}
      <p role="status" aria-live="polite" className={`m-0 min-h-[20px] text-[14px] ${msg?.bad ? "text-rani" : "text-emerald"}`}>
        {pending ? t("working") : msg?.text}
      </p>
    </div>
  );
}
