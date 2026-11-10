"use client";

import { useActionState, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import type { CampaignRow, Title } from "@/lib/admin/offers";
import { removeCampaign, saveCampaign, saveLabels, setCampaignActive } from "@/app/admin/(panel)/seasons/actions";
import type { FormResult } from "@/app/admin/(panel)/offers/actions";
import Toggle from "../products/Toggle";
import ResultLine from "../ResultLine";

type Props = { campaigns: CampaignRow[]; brandOfMonth: string; brands: string[]; messages: Title[]; today: string };

const panel = "min-w-0 rounded-[18px] border border-[#E1E6DF] bg-white p-[18px] shadow-[0_6px_18px_rgba(14,59,46,0.05)]";
const h2 = "m-0 mb-3 text-[16px] font-semibold text-emerald";
const field = "min-h-[44px] w-full min-w-0 rounded-xl border border-[#DDD3C0] bg-white px-3 text-[15px] text-ink focus:border-gold focus:outline-none";
const label = "flex min-w-0 flex-col gap-1.5 text-[13px] text-muted";
const primary = "inline-flex min-h-[44px] items-center justify-center rounded-full border border-emerald bg-emerald px-4 text-[15px] font-medium text-ivory-white disabled:opacity-60";
const chip = "inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium";
const OCCASIONS = ["Everyday", "Eid", "Wedding", "Birthday", "Anniversary", "Gifts"] as const;
const LANGS = [
  { k: "en", dir: "ltr" },
  { k: "ar", dir: "rtl" },
  { k: "ur", dir: "rtl" },
  { k: "hi", dir: "ltr" },
] as const;
const TONE: Record<CampaignRow["state"], string> = {
  live: "bg-[#E3F1E8] text-[#1E6B43]",
  scheduled: "bg-gold/30 text-gold-ink",
  ended: "bg-[#5C635F] text-white",
  off: "bg-[#EEF2EE] text-muted",
};

function CampaignForm({ c, today, onDone }: { c?: CampaignRow; today: string; onDone?: () => void }) {
  const t = useTranslations("Admin.seasons");
  const tOcc = useTranslations("Admin.products.occ");
  const [res, act, busy] = useActionState<FormResult, FormData>(async (p, f) => {
    const r = await saveCampaign(p, f);
    if (r.ok) onDone?.();
    return r;
  }, {});
  const [live, setLive] = useState(c?.active ?? true);
  return (
    <form action={act} key={res.ok && !c ? res.at : "f"} className="flex flex-col gap-3">
      {c && <input type="hidden" name="id" value={c.id} />}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {LANGS.map((l) => (
          <label key={l.k} className={label}>
            {t(`title_${l.k}`)}
            <input name={l.k} dir={l.dir} lang={l.k} maxLength={90} required={l.k === "en"} defaultValue={c?.title[l.k] ?? ""} placeholder={l.k === "en" ? t("titlePh") : ""} className={field} />
          </label>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <label className={label}>
          {t("from")}
          <input name="from" type="date" required defaultValue={c?.fromDay ?? today} className={field} />
        </label>
        <label className={label}>
          {t("to")}
          <input name="to" type="date" required defaultValue={c?.toDay ?? ""} className={field} />
        </label>
        <label className={label}>
          {t("discount")}
          <input name="pct" type="number" inputMode="numeric" min="0" max="90" defaultValue={c?.percent ?? 0} className={field} />
        </label>
        <label className={label}>
          {t("appliesTo")}
          <select name="occasion" defaultValue={c?.occasion ?? ""} className={field}>
            <option value="">{t("allSuits")}</option>
            {OCCASIONS.map((o) => (
              <option key={o} value={o}>
                {t("onlyOccasion", { occasion: tOcc(o) })}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-2 text-[14px]">
          <Toggle on={live} label={t("liveSwitch")} onChange={() => setLive((v) => !v)} />
          {t("liveSwitch")}
        </span>
        {live && <input type="hidden" name="active" value="on" />}
        <button type="submit" disabled={busy} className={`${primary} ms-auto`}>
          {c ? t("saveCampaign") : t("addCampaign")}
        </button>
      </div>
      <ResultLine result={res} ns="seasons" />
    </form>
  );
}

export default function SeasonsView({ campaigns, brandOfMonth, brands, messages, today }: Props) {
  const t = useTranslations("Admin.seasons");
  const tOcc = useTranslations("Admin.products.occ");
  const [editing, setEditing] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [rowRes, setRowRes] = useState<FormResult | null>(null);
  const [pending, start] = useTransition();
  const [msgs, setMsgs] = useState<(Title & { key: string })[]>(() => messages.map((m, i) => ({ ...m, key: `m${i}` })));
  const [labelsRes, labelsAct, labelsBusy] = useActionState<FormResult, FormData>(saveLabels, {});

  const toggle = (c: CampaignRow) => start(async () => setRowRes(await setCampaignActive(c.id, !c.active)));
  const remove = (c: CampaignRow) => {
    if (removing !== c.id) return setRemoving(c.id);
    setRemoving(null);
    start(async () => setRowRes(await removeCampaign(c.id)));
  };

  return (
    <>
      <div className="mb-[18px]">
        <h1 className="m-0 font-[family-name:var(--font-cormorant)] text-[28px] font-semibold leading-tight text-emerald md:text-[34px]">{t("title")}</h1>
        <p className="m-0 text-[14px] text-muted">{t("sub")}</p>
      </div>

      <section aria-labelledby="camps" className={panel}>
        <h2 id="camps" className={h2}>
          {t("campaignsTitle")} <small className="font-normal text-muted">· {t("campaignsHint")}</small>
        </h2>
        {campaigns.length === 0 ? (
          <p className="m-0 text-[14px] text-muted">{t("noCampaigns")}</p>
        ) : (
          <ul className="m-0 flex list-none flex-col p-0">
            {campaigns.map((c) => (
              <li key={c.id} className="border-b border-[#F0EBE1] py-2.5 last:border-b-0">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <span className="min-w-[180px] flex-1">
                    <b className="font-medium text-emerald">
                      <bdi>{c.title.en}</bdi>
                    </b>{" "}
                    <span className={`${chip} ${TONE[c.state]}`}>{t(`state.${c.state}`)}</span>
                    {c.title.ar && (
                      <bdi className="block text-[13px] text-muted" lang="ar" dir="rtl">
                        {c.title.ar}
                      </bdi>
                    )}
                    <small className="block text-muted">
                      <span dir="ltr">
                        {c.fromDay} → {c.toDay}
                      </span>{" "}
                      · {c.percent ? t("pctOff", { pct: c.percent }) : t("noDiscount")} · {c.occasion ? t("onlyOccasion", { occasion: tOcc(c.occasion) }) : t("allSuits")}
                    </small>
                  </span>
                  <Toggle on={c.active} label={t("liveFor", { name: c.title.en })} onChange={() => toggle(c)} />
                  <button type="button" onClick={() => setEditing(editing === c.id ? null : c.id)} aria-expanded={editing === c.id} className="min-h-[34px] rounded-full border border-[#CFC3AA] bg-white px-3 text-[13px] font-medium text-emerald">
                    {t("edit")}
                  </button>
                  <button type="button" disabled={pending} onClick={() => remove(c)} className="min-h-[34px] rounded-full border border-rani/40 bg-white px-3 text-[13px] font-medium text-rani disabled:opacity-60">
                    {removing === c.id ? t("confirmRemove") : t("remove")}
                  </button>
                </div>
                {editing === c.id && (
                  <div className="mt-3 rounded-xl bg-[#FAF8F3] p-3">
                    <CampaignForm c={c} today={today} onDone={() => setEditing(null)} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        <ResultLine result={rowRes} ns="seasons" />
        <details className="mt-3 border-t border-[#F0EBE1] pt-3" open={campaigns.length === 0}>
          <summary className="min-h-[36px] cursor-pointer py-1.5 text-[15px] font-medium text-emerald">{t("newCampaign")}</summary>
          <div className="mt-2">
            <CampaignForm today={today} />
          </div>
        </details>
      </section>

      <section aria-labelledby="labels" className={`${panel} mt-4`}>
        <h2 id="labels" className={h2}>
          {t("labelsTitle")}
        </h2>
        <form action={labelsAct} className="flex flex-col gap-3">
          <label className={`${label} max-w-[420px]`}>
            {t("brandOfMonth")}
            <select name="brand" defaultValue={brandOfMonth} className={field}>
              <option value="">{t("noBrand")}</option>
              {brands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </label>

          <fieldset className="m-0 flex flex-col gap-2.5 border-0 p-0">
            <legend className="mb-1.5 text-[13px] text-muted">{t("topBar")}</legend>
            <input type="hidden" name="count" value={msgs.length} />
            {msgs.map((m, i) => (
              <div key={m.key} className="rounded-xl border border-[#E1E6DF] bg-[#FBFCFA] p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <b className="text-[13px] text-emerald">{t("messageN", { n: i + 1 })}</b>
                  <button type="button" onClick={() => setMsgs((list) => list.filter((x) => x.key !== m.key))} className="min-h-[30px] text-[13px] text-rani underline underline-offset-2">
                    {t("removeMessage")}
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {LANGS.map((l) => (
                    <label key={l.k} className={label}>
                      {t(`lang_${l.k}`)}
                      <input name={`m${i}_${l.k}`} dir={l.dir} lang={l.k} maxLength={90} required={l.k === "en"} defaultValue={m[l.k]} className={field} />
                    </label>
                  ))}
                </div>
              </div>
            ))}
            {msgs.length < 8 && (
              <button
                type="button"
                onClick={() => setMsgs((list) => [...list, { en: "", ar: "", ur: "", hi: "", key: `n${Date.now()}` }])}
                className="self-start min-h-[38px] rounded-full border border-dashed border-[#CFC3AA] bg-white px-4 text-[14px] text-emerald"
              >
                {t("addMessage")}
              </button>
            )}
            <small className="text-[12px] text-muted">{t("topBarHint")}</small>
          </fieldset>

          <button type="submit" disabled={labelsBusy} className={`${primary} self-start`}>
            {t("saveLabels")}
          </button>
          <ResultLine result={labelsRes} ns="seasons" />
          <p className="m-0 text-[12px] text-muted">{t("labelsNote")}</p>
        </form>
      </section>
    </>
  );
}
