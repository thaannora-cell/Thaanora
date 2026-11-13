"use client";

import { useSubmit } from "../useSubmit";
import { useState } from "react";
import { useTranslations } from "next-intl";
import type { SettingsForm } from "@/lib/admin/settings";
import { saveSettings } from "@/app/admin/(panel)/settings/actions";
import type { FormResult } from "@/app/admin/(panel)/offers/actions";
import ResultLine from "../ResultLine";

const panel = "min-w-0 rounded-[18px] border border-[#E1E6DF] bg-white p-[18px] shadow-[0_6px_18px_rgba(14,59,46,0.05)]";
const h2 = "m-0 mb-3 text-[16px] font-semibold text-emerald";
const field =
  "min-h-[44px] w-full min-w-0 rounded-xl border border-[#DDD3C0] bg-white px-3 text-[15px] text-ink focus:border-gold focus:outline-none aria-[invalid=true]:border-rani";
const label = "flex min-w-0 flex-col gap-1.5 text-[13px] text-muted";

export default function SettingsView({ form: s }: { form: SettingsForm }) {
  const t = useTranslations("Admin.settings");
  const [res, act, busy] = useSubmit<FormResult>(saveSettings, {});
  const [fees, setFees] = useState(() => s.fees.map((f, i) => ({ ...f, key: `f${i}` })));
  const bad = (name: string) => (res && !res.ok && res.message === name ? true : undefined);

  return (
    <form onSubmit={act} noValidate>
      <div className="mb-[18px]">
        <h1 className="m-0 font-[family-name:var(--font-cormorant)] text-[28px] font-semibold leading-tight text-emerald md:text-[34px]">{t("title")}</h1>
        <p className="m-0 text-[14px] text-muted">{t("sub")}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section aria-labelledby="contact" className={panel}>
          <h2 id="contact" className={h2}>
            {t("contactTitle")}
          </h2>
          <div className="flex flex-col gap-3">
            <label className={label}>
              {t("whatsapp")}
              <input name="whatsapp" type="tel" inputMode="tel" dir="ltr" defaultValue={s.whatsapp} required aria-invalid={bad("whatsapp")} className={field} />
            </label>
            {(["instagram", "tiktok", "snapchat"] as const).map((k) => (
              <label key={k} className={label}>
                {t(k)}
                <input name={k} type="url" dir="ltr" defaultValue={s[k]} placeholder={`https://www.${k}.com/thaanora`} aria-invalid={bad(k)} className={field} />
              </label>
            ))}
            <small className="text-[12px] text-muted">{t("socialHint")}</small>
          </div>
        </section>

        <section aria-labelledby="fees" className={panel}>
          <h2 id="fees" className={h2}>
            {t("feesTitle")}
          </h2>
          <input type="hidden" name="feeCount" value={fees.length} />
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {fees.map((f, i) => (
              <li key={f.key} className="grid grid-cols-[1fr_96px_auto] items-end gap-2">
                <label className={label}>
                  <span className={i ? "sr-only" : ""}>{t("area")}</span>
                  <input name={`fee${i}_area`} defaultValue={f.area} maxLength={120} aria-invalid={bad(`fee${i}`)} className={field} />
                </label>
                <label className={label}>
                  <span className={i ? "sr-only" : ""}>{t("fee")}</span>
                  <input name={`fee${i}_fee`} type="number" inputMode="decimal" min="0" max="1000" step="1" defaultValue={f.fee} aria-invalid={bad(`fee${i}`)} className={field} />
                </label>
                <button type="button" onClick={() => setFees((list) => list.filter((x) => x.key !== f.key))} aria-label={t("removeArea", { area: f.area || "—" })} className="mb-1 h-[36px] w-[36px] rounded-full border border-rani/40 bg-white text-[18px] text-rani">
                  ×
                </button>
              </li>
            ))}
          </ul>
          {fees.length < 20 && (
            <button type="button" onClick={() => setFees((list) => [...list, { area: "", fee: 25, key: `n${Date.now()}` }])} className="mt-2 min-h-[38px] rounded-full border border-dashed border-[#CFC3AA] bg-white px-4 text-[14px] text-emerald">
              {t("addArea")}
            </button>
          )}
          <p className="m-0 mt-2 text-[12px] text-muted">{t("feesHint")}</p>
        </section>

        <section aria-labelledby="biz" className={panel}>
          <h2 id="biz" className={h2}>
            {t("bizTitle")}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className={`${label} sm:col-span-2`}>
              {t("legalName")}
              <input name="legalName" defaultValue={s.legalName} maxLength={120} className={field} />
            </label>
            <label className={label}>
              {t("entityType")}
              <input name="entityType" defaultValue={s.entityType} maxLength={80} className={field} />
            </label>
            <label className={label}>
              {t("nationalNo")}
              <input name="nationalNo" dir="ltr" defaultValue={s.nationalNo} maxLength={40} aria-invalid={bad("nationalNo")} className={field} />
            </label>
            <label className={label}>
              {t("vatNo")}
              <input name="vatNo" dir="ltr" inputMode="numeric" defaultValue={s.vatNo} placeholder="3XXXXXXXXXXXXX3" maxLength={20} aria-invalid={bad("vatNo")} className={field} />
            </label>
            <label className={label}>
              {t("address")}
              <input name="address" defaultValue={s.address} maxLength={160} className={field} />
            </label>
          </div>
          <p className="m-0 mt-2 text-[12px] text-muted">{t("bizHint")}</p>
        </section>

        <section aria-labelledby="pricing" className={panel}>
          <h2 id="pricing" className={h2}>
            {t("pricingTitle")}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <label className={label}>
              {t("pkrRate")}
              <input name="pkrRate" type="number" inputMode="decimal" min="1" step="0.01" defaultValue={s.pkrRate ?? ""} required aria-invalid={bad("pkrRate")} className={field} />
            </label>
            <label className={label}>
              {t("lowStock")}
              <input name="lowStock" type="number" inputMode="numeric" min="0" max="100" defaultValue={s.lowStock} required aria-invalid={bad("lowStock")} className={field} />
            </label>
          </div>
          <p className="m-0 mt-2 text-[12px] text-muted">{t("pricingHint")}</p>
        </section>

        <section aria-labelledby="signin" className={panel}>
          <h2 id="signin" className={h2}>
            {t("signinTitle")}
          </h2>
          <label className={label}>
            {t("signinMethod")}
            <select name="signinMethod" defaultValue={s.signinMethod} aria-invalid={bad("signinMethod")} className={field}>
              <option value="email">{t("signin.email")}</option>
              <option value="sms" disabled>
                {t("signin.sms")}
              </option>
              <option value="both" disabled>
                {t("signin.both")}
              </option>
            </select>
          </label>
          <p className="m-0 mt-2 text-[12px] text-muted">{t("signinHint")}</p>
          <label className="mt-3 flex items-start gap-2.5 text-[14px] text-ink">
            <input type="checkbox" name="requireSignIn" defaultChecked={s.requireSignIn} className="mt-1" />
            <span>
              {t("requireSignIn")}
              <small className="block text-[12px] text-muted">{t("requireSignInHint")}</small>
            </span>
          </label>
          <label className={`${label} mt-3`}>
            {t("birthdayPct")}
            <input name="birthdayPct" type="number" inputMode="numeric" min="0" max="50" step="1" defaultValue={s.birthdayPct} required aria-invalid={bad("birthdayPct")} className={field} />
          </label>
          <p className="m-0 mt-2 text-[12px] text-muted">{t("birthdayPctHint")}</p>
        </section>
      </div>

      <div className="sticky bottom-0 mt-4 flex flex-wrap items-center gap-3 border-t border-[#E1E6DF] bg-[#EEF1EC]/95 py-3 backdrop-blur">
        <button type="submit" disabled={busy} className="inline-flex min-h-[46px] items-center rounded-full bg-rani px-6 text-[15px] font-medium text-white disabled:opacity-60">
          {busy ? t("saving") : t("save")}
        </button>
        <ResultLine result={res} ns="settings" />
      </div>
    </form>
  );
}
