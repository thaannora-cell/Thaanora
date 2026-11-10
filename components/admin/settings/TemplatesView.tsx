"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useSubmit } from "../useSubmit";
import ResultLine from "../ResultLine";
import { saveTemplates } from "@/app/admin/(panel)/settings/actions";
import type { FormResult } from "@/app/admin/(panel)/offers/actions";
import { PLACEHOLDERS, TEMPLATE_KINDS, TEMPLATE_LANGS, TEMPLATE_MAX, unknownPlaceholders, type TemplateKind, type TemplateLang, type Templates } from "@/lib/wa-templates";

type Texts = Record<TemplateLang, Record<TemplateKind, string>>;

const panel = "min-w-0 rounded-[18px] border border-[#E1E6DF] bg-white p-[18px] shadow-[0_6px_18px_rgba(14,59,46,0.05)]";
const area =
  "min-h-[180px] w-full min-w-0 resize-y rounded-xl border border-[#DDD3C0] bg-white p-3 text-[14px] leading-relaxed text-ink focus:border-gold focus:outline-none aria-[invalid=true]:border-rani";

// Owner-only editor for the WhatsApp messages staff send (English and Arabic).
export default function TemplatesView({ saved, defaults }: { saved: Templates; defaults: Texts }) {
  const t = useTranslations("Admin.settings");
  const [res, act, busy] = useSubmit<FormResult>(saveTemplates, {});
  const [texts, setTexts] = useState<Texts>(() => {
    const out = {} as Texts;
    for (const lang of TEMPLATE_LANGS) {
      out[lang] = {} as Record<TemplateKind, string>;
      for (const kind of TEMPLATE_KINDS) out[lang][kind] = saved[lang]?.[kind] ?? defaults[lang][kind];
    }
    return out;
  });
  const set = (lang: TemplateLang, kind: TemplateKind, v: string) => setTexts((s) => ({ ...s, [lang]: { ...s[lang], [kind]: v } }));

  return (
    <form onSubmit={act} noValidate className="mt-6">
      <section aria-labelledby="tpl" className={panel}>
        <h2 id="tpl" className="m-0 text-[16px] font-semibold text-emerald">
          {t("tplTitle")}
        </h2>
        <p className="m-0 mb-1 mt-1 text-[14px] text-muted">{t("tplSub")}</p>
        <p className="m-0 mb-4 text-[12px] text-muted">{t("tplHint")}</p>

        <div className="flex flex-col gap-5">
          {TEMPLATE_KINDS.map((kind) => (
            <fieldset key={kind} className="m-0 min-w-0 border-0 border-t border-[#F0EBE1] p-0 pt-4 first:border-t-0 first:pt-0">
              <legend className="mb-2 p-0 text-[15px] font-medium text-emerald">{t(`tplKinds.${kind}`)}</legend>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {TEMPLATE_LANGS.map((lang) => {
                  const name = `tpl_${lang}_${kind}`;
                  const value = texts[lang][kind];
                  const edited = value.trim() !== defaults[lang][kind].trim();
                  const bad = unknownPlaceholders(kind, value).length > 0 || (res && !res.ok && res.message === name) ? true : undefined;
                  return (
                    <div key={lang} className="flex min-w-0 flex-col gap-1.5">
                      <div className="flex items-center justify-between gap-2 text-[13px] text-muted">
                        <label htmlFor={name}>
                          {t(`tplLang.${lang}`)}
                          {edited && <span className="ms-2 rounded-full bg-[#F6EEDC] px-2 py-0.5 text-[11px] text-gold-ink">{t("tplEdited")}</span>}
                        </label>
                        {edited && (
                          <button type="button" onClick={() => set(lang, kind, defaults[lang][kind])} className="min-h-[32px] rounded-full border border-[#DDD3C0] bg-white px-3 text-[12px] text-emerald">
                            {t("tplReset")}
                          </button>
                        )}
                      </div>
                      <textarea
                        id={name}
                        name={name}
                        dir={lang === "ar" ? "rtl" : "ltr"}
                        lang={lang}
                        maxLength={TEMPLATE_MAX}
                        value={value}
                        onChange={(e) => set(lang, kind, e.target.value)}
                        aria-invalid={bad}
                        className={`${area} ${lang === "ar" ? "font-[family-name:var(--font-amiri)] text-[15px]" : ""}`}
                      />
                    </div>
                  );
                })}
              </div>
              <p className="m-0 mt-2 flex flex-wrap items-center gap-1.5 text-[12px] text-muted">
                {t("tplCanUse")}
                {PLACEHOLDERS[kind].map((w) => (
                  <code key={w} dir="ltr" className="rounded-md bg-[#F4F7F4] px-1.5 py-0.5 text-[12px] text-emerald">
                    {`{${w}}`}
                  </code>
                ))}
              </p>
            </fieldset>
          ))}
        </div>
      </section>

      <div className="sticky bottom-0 mt-4 flex flex-wrap items-center gap-3 border-t border-[#E1E6DF] bg-[#EEF1EC]/95 py-3 backdrop-blur">
        <button type="submit" disabled={busy} className="inline-flex min-h-[46px] items-center rounded-full bg-rani px-6 text-[15px] font-medium text-white disabled:opacity-60">
          {busy ? t("saving") : t("tplSave")}
        </button>
        <ResultLine result={res} ns="settings" />
      </div>
    </form>
  );
}
