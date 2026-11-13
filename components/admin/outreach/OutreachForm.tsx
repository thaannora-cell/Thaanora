"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { previewSegment, sendOutreach, type SendResult } from "@/app/admin/(panel)/outreach/actions";

type Props = {
  brands: string[];
  initial: { kind: "announcement" | "offer"; segment: string; value: string; customerName: string | null };
};

const LANGS = ["en", "ar", "ur", "hi"] as const;
const field = "th-field text-[15px]";
const label = "flex min-w-0 flex-col gap-1.5 text-[13px] text-muted";

// Compose an announcement or a personal offer, pick who gets it, see how many, send.
export default function OutreachForm({ brands, initial }: Props) {
  const t = useTranslations("Admin.outreach");
  const [kind, setKind] = useState(initial.kind);
  const [segment, setSegment] = useState(initial.segment);
  const [value, setValue] = useState(initial.value);
  const [counted, setCount] = useState<number | null>(null);
  const [counting, startCount] = useTransition();
  const [state, action, pending] = useActionState<SendResult | null, FormData>(sendOutreach, null);
  const needsValue = segment === "level" || segment === "brand" || segment === "customer";
  const count = needsValue && !value ? null : counted;

  useEffect(() => {
    if (needsValue && !value) return;
    startCount(async () => {
      const r = await previewSegment(segment, value);
      setCount("count" in r ? r.count : null);
    });
  }, [segment, value, needsValue]);

  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(t("confirmSend", { count: count ?? 0 }))) e.preventDefault();
      }}
      className="flex flex-col gap-4"
    >
      <input type="hidden" name="kind" value={kind} />
      <div role="group" aria-label={t("kindLabel")} className="flex flex-wrap gap-2">
        {(["announcement", "offer"] as const).map((k) => (
          <button
            key={k}
            type="button"
            aria-pressed={kind === k}
            onClick={() => setKind(k)}
            className="min-h-[40px] rounded-full border border-[#CFC3AA] bg-white px-4 text-[14px] font-medium text-emerald aria-pressed:border-emerald aria-pressed:bg-emerald aria-pressed:text-white"
          >
            {t(`kind.${k}`)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className={label}>
          {t("segmentLabel")}
          <select name="segment" value={segment} onChange={(e) => (setSegment(e.target.value), setValue(""))} className={field}>
            {(["all", "level", "brand", "inactive", "birthday_month", "customer"] as const).map((s) => (
              <option key={s} value={s} disabled={s === "customer" && initial.segment !== "customer"}>
                {t(`segment.${s}`)}
              </option>
            ))}
          </select>
        </label>
        {segment === "level" && (
          <label className={label}>
            {t("levelLabel")}
            <select name="segmentValue" value={value} onChange={(e) => setValue(e.target.value)} className={field} required>
              <option value="">—</option>
              {(["silver", "gold", "emerald", "none"] as const).map((l) => (
                <option key={l} value={l}>
                  {t(`level.${l}`)}
                </option>
              ))}
            </select>
          </label>
        )}
        {segment === "brand" && (
          <label className={label}>
            {t("brandLabel")}
            <select name="segmentValue" value={value} onChange={(e) => setValue(e.target.value)} className={field} required>
              <option value="">—</option>
              {brands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </label>
        )}
        {segment === "customer" && (
          <label className={label}>
            {t("customerLabel")}
            <input type="hidden" name="segmentValue" value={value} />
            <span className="th-field bg-[#F6F3EE] text-[15px] text-ink">{initial.customerName ?? "—"}</span>
          </label>
        )}
      </div>
      <p className="m-0 text-[14px] text-emerald" aria-live="polite">
        {counting ? t("counting") : count === null ? t("pickSegment") : t("reaches", { count })}
      </p>

      {kind === "offer" && (
        <div className="grid grid-cols-2 gap-3 md:max-w-[420px]">
          <label className={label}>
            {t("percent")}
            <input name="percent" type="number" min="1" max="50" step="1" defaultValue={10} required className={field} />
          </label>
          <label className={label}>
            {t("days")}
            <input name="days" type="number" min="1" max="365" step="1" defaultValue={14} required className={field} />
          </label>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {LANGS.map((l) => (
          <fieldset key={l} className="m-0 flex flex-col gap-2 rounded-xl border border-[#E7E1D4] p-3" dir={l === "ar" || l === "ur" ? "rtl" : "ltr"}>
            <legend className="px-1 text-[12px] font-semibold uppercase tracking-[0.1em] text-gold-ink">{t(`lang.${l}`)}</legend>
            <input name={`title_${l}`} required={l === "en"} maxLength={120} placeholder={t("titlePlaceholder")} aria-label={`${t("titleLabel")} (${t(`lang.${l}`)})`} className={field} />
            <textarea name={`body_${l}`} maxLength={600} rows={2} placeholder={kind === "offer" ? t("offerBodyPlaceholder") : t("bodyPlaceholder")} aria-label={`${t("bodyLabel")} (${t(`lang.${l}`)})`} className={field} />
          </fieldset>
        ))}
      </div>
      <p className="m-0 text-[12px] text-muted">{kind === "offer" ? t("offerHint") : t("announcementHint")}</p>

      {state && (
        <p role={state.ok ? "status" : "alert"} className={`m-0 text-[14px] ${state.ok ? "text-emerald" : "text-rani"}`}>
          {state.ok ? t("sent", { count: state.count }) : t(`errors.${state.error}`)}
        </p>
      )}
      <button type="submit" disabled={pending || !count} className="min-h-[46px] self-start rounded-full bg-rani px-6 text-[15px] font-medium text-white disabled:opacity-50">
        {pending ? t("sending") : kind === "offer" ? t("sendOffer") : t("sendAnnouncement")}
      </button>
    </form>
  );
}
