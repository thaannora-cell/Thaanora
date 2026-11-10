"use client";

import { useSubmit } from "../useSubmit";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import type { AdminTailor } from "@/lib/admin/tailors";
import { saveDefaultPct, saveTailor, setTailorVisible } from "@/app/admin/(panel)/tailors/actions";
import type { FormResult } from "@/app/admin/(panel)/offers/actions";
import Toggle from "../products/Toggle";
import ResultLine from "../ResultLine";

type Props = { tailors: AdminTailor[]; defaultPct: number; areas: string[] };

const panel = "min-w-0 rounded-[18px] border border-[#E1E6DF] bg-white p-[18px] shadow-[0_6px_18px_rgba(14,59,46,0.05)]";
const h2 = "m-0 mb-3 text-[16px] font-semibold text-emerald";
const field = "min-h-[44px] w-full min-w-0 rounded-xl border border-[#DDD3C0] bg-white px-3 text-[15px] text-ink focus:border-gold focus:outline-none";
const label = "flex min-w-0 flex-col gap-1.5 text-[13px] text-muted";
const primary = "inline-flex min-h-[44px] items-center justify-center rounded-full border border-emerald bg-emerald px-4 text-[15px] font-medium text-ivory-white disabled:opacity-60";
const short = (a: string) => a.split(" (")[0];

function TailorForm({ t: tailor, areas, defaultPct, onDone }: { t?: AdminTailor; areas: string[]; defaultPct: number; onDone?: () => void }) {
  const t = useTranslations("Admin.tailors");
  const [res, act, busy] = useSubmit<FormResult>(async (p, f) => {
    const r = await saveTailor(p, f);
    if (r.ok) onDone?.();
    return r;
  }, {});
  return (
    <form onSubmit={act} key={res.ok && !tailor ? res.at : "f"} className="flex flex-col gap-3">
      {tailor && <input type="hidden" name="id" value={tailor.id} />}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        <label className={label}>
          {t("name")}
          <input name="name" required maxLength={80} defaultValue={tailor?.name ?? ""} className={field} />
        </label>
        <label className={label}>
          {t("area")}
          <select name="area" required defaultValue={tailor?.area ?? areas[0] ?? ""} className={field}>
            {areas.map((a) => (
              <option key={a} value={a}>
                {short(a)}
              </option>
            ))}
          </select>
        </label>
        <label className={label}>
          {t("phone")}
          <input name="phone" type="tel" inputMode="tel" dir="ltr" placeholder="05X XXX XXXX" defaultValue={tailor?.phone ?? ""} className={field} />
        </label>
        <label className={label}>
          {t("memberPct")}
          <input name="pct" type="number" inputMode="numeric" min="0" max="50" placeholder={t("defaultPh", { pct: defaultPct })} defaultValue={tailor?.memberPct ?? ""} className={field} />
        </label>
      </div>
      <label className={label}>
        {t("note")}
        <input name="note" maxLength={120} defaultValue={tailor?.note ?? ""} placeholder={t("notePh")} className={field} />
      </label>
      <button type="submit" disabled={busy} className={`${primary} self-start`}>
        {tailor ? t("save") : t("add")}
      </button>
      <ResultLine result={res} ns="tailors" />
    </form>
  );
}

export default function TailorsView({ tailors, defaultPct, areas }: Props) {
  const t = useTranslations("Admin.tailors");
  const [editing, setEditing] = useState<string | null>(null);
  const [rowRes, setRowRes] = useState<FormResult | null>(null);
  const [, start] = useTransition();
  const [defRes, defAct, defBusy] = useSubmit<FormResult>(saveDefaultPct, {});

  return (
    <>
      <div className="mb-[18px]">
        <h1 className="m-0 font-[family-name:var(--font-cormorant)] text-[28px] font-semibold leading-tight text-emerald md:text-[34px]">{t("title")}</h1>
        <p className="m-0 text-[14px] text-muted">{t("sub", { listed: tailors.filter((x) => x.visible).length, total: tailors.length })}</p>
      </div>

      <section aria-labelledby="def" className={panel}>
        <h2 id="def" className={h2}>
          {t("defaultTitle")}
        </h2>
        <form onSubmit={defAct} className="flex flex-wrap items-end gap-3">
          <label className={`${label} w-[160px]`}>
            {t("memberPct")}
            <input name="pct" type="number" inputMode="numeric" min="0" max="50" defaultValue={defaultPct} required className={field} />
          </label>
          <button type="submit" disabled={defBusy} className={primary}>
            {t("saveDefault")}
          </button>
        </form>
        <p className="m-0 mt-2 text-[12px] text-muted">{t("defaultHint")}</p>
        <ResultLine result={defRes} ns="tailors" />
      </section>

      <section aria-labelledby="list" className={`${panel} mt-4`}>
        <h2 id="list" className={h2}>
          {t("listTitle")}
        </h2>
        {tailors.length === 0 && <p className="m-0 text-[14px] text-muted">{t("none")}</p>}
        <ul className="m-0 flex list-none flex-col p-0">
          {tailors.map((x) => (
            <li key={x.id} className={`border-b border-[#F0EBE1] py-2.5 last:border-b-0 ${x.visible ? "" : "opacity-70"}`}>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="min-w-[200px] flex-1">
                  <b className="font-medium text-emerald">
                    <bdi>{x.name}</bdi>
                  </b>
                  <small className="block text-muted">
                    {short(x.area)} · {x.memberPct === null ? t("usesDefault", { pct: defaultPct }) : t("ownPct", { pct: x.memberPct })}
                    {x.phone && (
                      <>
                        {" · "}
                        <bdi dir="ltr">{x.phone}</bdi>
                      </>
                    )}
                  </small>
                </span>
                <span className="flex items-center gap-2 text-[13px] text-muted">
                  <Toggle on={x.visible} label={t("listedFor", { name: x.name })} onChange={() => start(async () => setRowRes(await setTailorVisible(x.id, !x.visible)))} />
                  {x.visible ? t("listed") : t("hidden")}
                </span>
                <button type="button" onClick={() => setEditing(editing === x.id ? null : x.id)} aria-expanded={editing === x.id} className="min-h-[34px] rounded-full border border-[#CFC3AA] bg-white px-3 text-[13px] font-medium text-emerald">
                  {t("edit")}
                </button>
              </div>
              {editing === x.id && (
                <div className="mt-3 rounded-xl bg-[#FAF8F3] p-3">
                  <TailorForm t={x} areas={areas} defaultPct={defaultPct} onDone={() => setEditing(null)} />
                </div>
              )}
            </li>
          ))}
        </ul>
        <ResultLine result={rowRes} ns="tailors" />
        <details className="mt-3 border-t border-[#F0EBE1] pt-3" open={tailors.length === 0}>
          <summary className="min-h-[36px] cursor-pointer py-1.5 text-[15px] font-medium text-emerald">{t("newTailor")}</summary>
          <div className="mt-2">
            <TailorForm areas={areas} defaultPct={defaultPct} />
          </div>
        </details>
      </section>
    </>
  );
}
