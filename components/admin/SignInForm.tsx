"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { signInAction, type SignInState } from "@/app/admin/actions";

const field =
  "min-h-[50px] w-full rounded-[14px] border border-[#DDD3C0] bg-white px-3.5 text-[16px] text-ink focus:border-gold focus:outline-none";
const linkBtn = "min-h-[36px] text-emerald underline underline-offset-2 disabled:opacity-60";

export default function SignInForm({ linkFailed = false }: { linkFailed?: boolean }) {
  const t = useTranslations("Admin.signIn");
  const [state, act, busy] = useActionState<SignInState, FormData>(
    signInAction,
    linkFailed ? { step: "email", error: "badLink" } : { step: "email" },
  );
  const codeRef = useRef<HTMLInputElement>(null);
  const onCode = state.step === "code";

  useEffect(() => {
    if (onCode) codeRef.current?.focus();
  }, [onCode, state]);

  const error = state.error ? t(state.error) : null;
  const alert = error && (
    <p role="alert" className="m-0 text-[13px] text-rani">
      {error}
    </p>
  );

  if (!onCode) {
    return (
      <form action={act} className="flex flex-col gap-3 text-start">
        <input type="hidden" name="intent" value="send" />
        <p className="m-0 text-center text-[14px] text-muted">{t("intro")}</p>
        <label className="flex flex-col gap-1.5 text-[13px] text-muted">
          {t("email")}
          <input name="email" type="email" inputMode="email" autoComplete="email" required dir="ltr" defaultValue={state.email ?? ""} className={field} />
        </label>
        {alert}
        <button type="submit" className="th-btn th-btn-pink justify-center" disabled={busy}>
          {busy ? t("sending") : t("send")}
        </button>
        <Link href="/" className="text-center text-[14px] text-emerald underline underline-offset-2">
          {t("toSite")}
        </Link>
      </form>
    );
  }

  return (
    <form action={act} className="flex flex-col gap-3 text-start">
      <input type="hidden" name="email" value={state.email} />
      <p className="m-0 text-center text-[14px] text-muted" aria-live="polite">
        {t("codeIntro", { email: state.email })}
      </p>
      <label className="flex flex-col gap-1.5 text-[13px] text-muted">
        {t("code")}
        <input
          ref={codeRef}
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={12}
          dir="ltr"
          className={`${field} text-center text-[22px] tracking-[0.35em]`}
        />
      </label>
      {alert}
      {state.resent && !error && (
        <p role="status" className="m-0 text-[13px] text-emerald">
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
