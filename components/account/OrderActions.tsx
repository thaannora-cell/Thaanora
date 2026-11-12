"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { cancelMyOrder } from "@/app/[locale]/account/actions";

// The shop keeps the bag on this device under this key (see SelectionProvider).
const BAG_KEY = "th_selection";
type Line = { code: string; qty: number; stitch: boolean };

// "Order again" (adds the suits still in stock to the bag and opens it) and "Cancel" while waiting.
export default function OrderActions({
  orderNo,
  canCancel,
  reorder,
}: {
  orderNo: string;
  canCancel: boolean;
  reorder: Line[]; // only suits that can be ordered now, already capped to what's in stock
}) {
  const t = useTranslations("Orders");
  const locale = useLocale();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null);
  const [pending, start] = useTransition();

  const orderAgain = () => {
    let bag: Line[] = [];
    try {
      const saved = JSON.parse(window.localStorage.getItem(BAG_KEY) ?? "[]");
      if (Array.isArray(saved)) bag = saved.filter((l) => l && typeof l.code === "string");
    } catch {
      bag = [];
    }
    for (const r of reorder) {
      const same = bag.find((l) => l.code === r.code);
      if (same) same.qty = Math.max(same.qty, r.qty);
      else bag.push(r);
    }
    try {
      window.localStorage.setItem(BAG_KEY, JSON.stringify(bag));
    } catch {
      /* private mode: nothing to keep */
    }
    // The shop page opens the bag when it sees ?bag=open.
    window.location.href = `/${locale}?bag=open`;
  };

  const cancel = () => {
    if (!confirming) return setConfirming(true);
    start(async () => {
      const r = await cancelMyOrder(orderNo, locale);
      setConfirming(false);
      if (r.ok) {
        setMsg({ text: t("cancelled") });
        router.refresh();
      } else setMsg({ text: t(r.error === "notAllowed" ? "cannotCancel" : "cancelFailed"), bad: true });
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {reorder.length > 0 && (
          <button type="button" onClick={orderAgain} className="th-btn th-btn-pink">
            {t("orderAgain")}
          </button>
        )}
        {canCancel && (
          <button type="button" onClick={cancel} disabled={pending} className="th-btn border-rani/50 text-rani disabled:opacity-60">
            {pending ? t("cancelling") : confirming ? t("cancelConfirm") : t("cancel")}
          </button>
        )}
      </div>
      {confirming && !pending && <p className="m-0 text-[13px] text-muted">{t("cancelHint")}</p>}
      {msg && (
        <p role={msg.bad ? "alert" : "status"} className={`m-0 text-[14px] ${msg.bad ? "text-rani" : "text-emerald"}`}>
          {msg.text}
        </p>
      )}
    </div>
  );
}
