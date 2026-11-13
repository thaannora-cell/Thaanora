"use client";

import { useActionState, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { saveProfile, type ProfileState } from "@/app/[locale]/account/actions";
import type { Customer } from "@/lib/customer/account";

const LANGS = [
  ["en", "English"],
  ["ar", "العربية"],
  ["ur", "اردو"],
  ["hi", "हिन्दी"],
] as const;

const label = "flex flex-col gap-1.5 text-[13px] text-muted";

// Name, mobile, language and birthday. "create" right after the first sign-in; "edit" from the overview.
export default function ProfileForm({ customer = null, next = null }: { customer?: Customer | null; next?: string | null }) {
  const t = useTranslations("Account");
  const locale = useLocale();
  const [state, act, busy] = useActionState<ProfileState, FormData>(saveProfile, {});
  const creating = !customer;
  // New accounts start with the name and mobile used at checkout on this device, if any.
  const [start, setStart] = useState({ name: customer?.name ?? "", phone: customer ? `0${customer.phone.slice(4)}` : "" });
  useEffect(() => {
    if (!creating) return;
    try {
      const c = JSON.parse(window.localStorage.getItem("th_checkout") ?? "{}") as { customerName?: unknown; customerPhone?: unknown };
      setStart((s) => ({
        name: s.name || (typeof c.customerName === "string" ? c.customerName : ""),
        phone: s.phone || (typeof c.customerPhone === "string" ? c.customerPhone : ""),
      }));
    } catch {
      /* nothing saved */
    }
  }, [creating]);
  const bad = (f: string) => (state.field === f ? true : undefined);

  return (
    <form action={act} className="flex flex-col gap-3.5" key={`${start.name}|${start.phone}`}>
      <input type="hidden" name="locale" value={locale} />
      {next && <input type="hidden" name="next" value={next} />}
      <label className={label}>
        {t("name")}
        <input name="name" required maxLength={80} autoComplete="name" defaultValue={start.name} aria-invalid={bad("name")} className="th-field text-[16px]" />
      </label>
      <label className={label}>
        {t("phone")}
        <input name="phone" type="tel" inputMode="tel" required autoComplete="tel" dir="ltr" placeholder="05X XXX XXXX" defaultValue={start.phone} aria-invalid={bad("phone")} className="th-field text-start text-[16px]" />
        <small className="text-[12px]">{t("phoneHint")}</small>
      </label>
      <label className={label}>
        {t("language")}
        <select name="language" defaultValue={customer?.language ?? locale} className="th-field text-[16px]">
          {LANGS.map(([code, name]) => (
            <option key={code} value={code} lang={code}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <label className={label}>
        {t("birthday")}
        {customer?.birthday ? (
          <>
            <input type="date" value={customer.birthday} readOnly aria-readonly="true" className="th-field bg-[#F1EEE8] text-[16px] text-muted" />
            <small className="text-[12px]">{t("birthdayLocked")}</small>
          </>
        ) : (
          <>
            <input name="birthday" type="date" min="1920-01-01" defaultValue="" aria-invalid={bad("birthday")} className="th-field text-[16px]" />
            <small className="text-[12px]">{t("birthdayHint")}</small>
          </>
        )}
      </label>
      {state.error && (
        <p role="alert" className="m-0 text-[14px] text-rani">
          {t(`profileErrors.${state.error}`)}
        </p>
      )}
      {state.ok && (
        <p role="status" className="m-0 text-[14px] text-emerald">
          {t("saved")}
        </p>
      )}
      <button type="submit" className="th-btn th-btn-pink justify-center" disabled={busy}>
        {busy ? t("saving") : creating ? t("create") : t("save")}
      </button>
    </form>
  );
}
