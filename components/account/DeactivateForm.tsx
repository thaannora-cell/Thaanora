"use client";

import { useActionState, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { deactivateAccount } from "@/app/[locale]/account/care-actions";

// Deactivate my account: a clear warning, a tick, then a pink button.
export default function DeactivateForm() {
  const t = useTranslations("Privacy");
  const locale = useLocale();
  const [state, action, pending] = useActionState(deactivateAccount, {});
  const [sure, setSure] = useState(false);
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="locale" value={locale} />
      <label className="flex items-start gap-2.5 text-[14px]">
        <input type="checkbox" name="confirm" checked={sure} onChange={(e) => setSure(e.target.checked)} className="mt-1" />
        <span>{t("deactivateConfirm")}</span>
      </label>
      {state.error && (
        <p role="alert" className="m-0 text-[13px] text-rani">
          {t(`errors.${state.error}`)}
        </p>
      )}
      <button type="submit" disabled={!sure || pending} className="th-btn th-btn-pink self-start disabled:opacity-50">
        {pending ? t("deactivating") : t("deactivateButton")}
      </button>
    </form>
  );
}
