"use client";

import { useEffect, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { claimOrder } from "@/app/[locale]/account/actions";
import { LAST_ORDER_KEY } from "@/lib/customer/last-order";


type Msg = { text: string; bad?: boolean } | null;

export default function ClaimOrder() {
  const t = useTranslations("Account");
  const locale = useLocale();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<Msg>(null);
  const [orderNo, setOrderNo] = useState("");
  const [phone, setPhone] = useState("");

  // The order placed on this device as a guest, if any: add it once, then forget it.
  useEffect(() => {
    let last: { orderNo?: unknown; phone?: unknown } | null = null;
    try {
      last = JSON.parse(window.localStorage.getItem(LAST_ORDER_KEY) ?? "null");
    } catch {
      last = null;
    }
    if (!last || typeof last.orderNo !== "string" || typeof last.phone !== "string") return;
    const { orderNo: no, phone: ph } = last as { orderNo: string; phone: string };
    claimOrder(no, ph, locale).then((r) => {
      if (r.ok || r.error === "not_found") window.localStorage.removeItem(LAST_ORDER_KEY);
      if (r.ok) {
        setMsg({ text: t("autoClaimed", { orderNo: r.orderNo }) });
        router.refresh();
      }
    });
  }, [locale, router, t]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const r = await claimOrder(orderNo, phone, locale);
      if (r.ok) {
        setMsg({ text: t("claimed", { orderNo: r.orderNo }) });
        setOrderNo("");
        router.refresh();
      } else setMsg({ text: t(`claimErrors.${r.error === "signedOut" ? "failed" : r.error}`), bad: true });
    });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-[13px] text-muted">
          {t("orderNo")}
          <input className="th-field text-start uppercase" dir="ltr" required autoComplete="off" placeholder="TH-1024" value={orderNo} onChange={(e) => setOrderNo(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1.5 text-[13px] text-muted">
          {t("orderPhone")}
          <input className="th-field text-start" dir="ltr" type="tel" inputMode="tel" required placeholder="05X XXX XXXX" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>
      </div>
      <button type="submit" disabled={pending} className="th-btn justify-center self-start disabled:opacity-60">
        {pending ? t("claiming") : t("claim")}
      </button>
      {msg && (
        <p role={msg.bad ? "alert" : "status"} className={`m-0 text-[14px] ${msg.bad ? "text-rani" : "text-emerald"}`}>
          {msg.text}
        </p>
      )}
    </form>
  );
}
