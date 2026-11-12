"use client";

import { useActionState, useEffect, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { customerSignIn, type CustomerSignInState } from "@/app/[locale]/account/actions";

const field = "th-field min-h-[50px] text-[16px]";
const linkBtn = "min-h-[40px] text-emerald underline underline-offset-2 disabled:opacity-60";

// Step 1: email → Step 2: the 6-digit code from the email. New emails become accounts.
export default function SignInForm({ linkFailed = false }: { linkFailed?: boolean }) {
  const t = useTranslations("Account");
  const locale = useLocale();
  const [state, act, busy] = useActionState<CustomerSignInState, FormData>(
    customerSignIn,
    linkFailed ? { step: "email", error: "badLink" } : { step: "email" },
  );
  const codeRef = useRef<HTMLInputElement>(null);
  const onCode = state.step === "code";
  useEffect(() => {
    if (onCode) codeRef.current?.focus();
  }, [onCode, state]);

  const alert = state.error && (
    <p role="alert" className="m-0 text-[14px] text-rani">
      {t(`errors.${state.error}`)}
    </p>
  );

  if (!onCode) {
    return (
      <form action={act} className="flex flex-col gap-3">
        <input type="hidden" name="intent" value="send" />
        <input type="hidden" name="locale" value={locale} />
        <label className="flex flex-col gap-1.5 text-[13px] text-muted">
          {t("email")}
          <input name="email" type="email" inputMode="email" autoComplete="email" required dir="ltr" defaultValue={state.email ?? ""} className={`${field} text-start`} />
        </label>
        {alert}
        <button type="submit" className="th-btn th-btn-pink justify-center" disabled={busy}>
          {busy ? t("sending") : t("send")}
        </button>
      </form>
    );
  }

  return (
    <form action={act} className="flex flex-col gap-3">
      <input type="hidden" name="email" value={state.email} />
      <input type="hidden" name="locale" value={locale} />
      <p className="m-0 text-[14px] text-muted" aria-live="polite">
        {t.rich("codeIntro", { email: state.email, b: (c) => <bdi dir="ltr" className="font-medium text-emerald">{c}</bdi> })}
      </p>
      <label className="flex flex-col gap-1.5 text-[13px] text-muted">
        {t("code")}
        <input
          ref={codeRef}
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={10}
          dir="ltr"
          className={`${field} text-center text-[22px] tracking-[0.35em]`}
        />
      </label>
      {alert}
      {state.resent && !state.error && (
        <p role="status" className="m-0 text-[14px] text-emerald">
          {t("resent")}
        </p>
      )}
      <button type="submit" name="intent" value="verify" className="th-btn th-btn-pink justify-center" disabled={busy}>
        {busy ? t("verifying") : t("verify")}
      </button>
      <div className="flex flex-wrap justify-between gap-2 text-[14px]">
        <button type="submit" name="intent" value="resend" formNoValidate className={linkBtn} disabled={busy}>
          {t("resend")}
        </button>
        <button type="submit" name="intent" value="back" formNoValidate className={linkBtn} disabled={busy}>
          {t("otherEmail")}
        </button>
      </div>
    </form>
  );
}
