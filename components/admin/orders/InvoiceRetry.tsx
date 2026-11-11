"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { retryInvoice } from "@/app/admin/(panel)/orders/actions";

// "Retry" (after a failure) or "Create invoice" (never tried) on a delivered order.
export default function InvoiceRetry({ orderId, label }: { orderId: string; label: "retry" | "create" }) {
  const t = useTranslations("Admin.orders.invoice");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await retryInvoice(orderId);
            const out = r.ok ? r.invoice : undefined;
            setMsg(out === "issued" ? { text: t("madeNow") } : out === "busy" ? { text: t("busy") } : { text: t("failedNow"), bad: true });
          })
        }
        className="inline-flex min-h-[44px] items-center rounded-full bg-rani px-5 text-[15px] font-medium text-white disabled:opacity-60"
      >
        {pending ? t("working") : t(label)}
      </button>
      {msg && (
        <p role="status" className={`m-0 text-[13px] ${msg.bad ? "text-rani" : "text-emerald"}`}>
          {msg.text}
        </p>
      )}
    </div>
  );
}
