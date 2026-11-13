"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { cancelMyReturn } from "@/app/[locale]/account/care-actions";

// Withdraw a return request we haven't looked at yet.
export default function ReturnCancel({ orderNo }: { orderNo: string }) {
  const t = useTranslations("Returns");
  const locale = useLocale();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [failed, setFailed] = useState(false);
  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!window.confirm(t("withdrawConfirm"))) return;
          start(async () => {
            const r = await cancelMyReturn(orderNo, locale);
            if (r.ok) router.refresh();
            else setFailed(true);
          });
        }}
        className="min-h-[40px] self-start text-[14px] text-emerald underline underline-offset-2 disabled:opacity-60"
      >
        {t("withdraw")}
      </button>
      {failed && (
        <p role="alert" className="m-0 text-[13px] text-rani">
          {t("withdrawFailed")}
        </p>
      )}
    </div>
  );
}
