"use client";

import { useSubmit } from "../useSubmit";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import type { BrandRow, CodeRow } from "@/lib/admin/offers";
import { addCode, removeCode, saveBrandSale, saveBundle, setCodeActive, type FormResult } from "@/app/admin/(panel)/offers/actions";
import Toggle from "../products/Toggle";
import ResultLine from "../ResultLine";

type Props = { bundle: { active: boolean; qty: number; pct: number } | null; codes: CodeRow[]; brands: BrandRow[]; today: string };

const panel = "min-w-0 rounded-[18px] border border-[#E1E6DF] bg-white p-[18px] shadow-[0_6px_18px_rgba(14,59,46,0.05)]";
const h2 = "m-0 mb-3 text-[16px] font-semibold text-emerald";
const field = "min-h-[44px] w-full min-w-0 rounded-xl border border-[#DDD3C0] bg-white px-3 text-[15px] text-ink focus:border-gold focus:outline-none";
const label = "flex min-w-0 flex-col gap-1.5 text-[13px] text-muted";
const primary = "inline-flex min-h-[44px] items-center justify-center rounded-full border border-emerald bg-emerald px-4 text-[15px] font-medium text-ivory-white disabled:opacity-60";
const chip = "inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium";
const TONE: Record<CodeRow["state"], string> = {
  live: "bg-[#E3F1E8] text-[#1E6B43]",
  paused: "bg-[#EEF2EE] text-muted",
  ended: "bg-[#5C635F] text-white",
  usedUp: "bg-[#5C635F] text-white",
  scheduled: "bg-gold/30 text-gold-ink",
};

export default function OffersView({ bundle, codes, brands, today }: Props) {
  const t = useTranslations("Admin.offers");
  const [bundleRes, bundleAct, bundleBusy] = useSubmit<FormResult>(saveBundle, {});
  const [saleRes, saleAct, saleBusy] = useSubmit<FormResult>(saveBrandSale, {});
  const [codeRes, codeAct, codeBusy] = useSubmit<FormResult>(addCode, {});
  const [rowRes, setRowRes] = useState<FormResult | null>(null);
  const [pending, start] = useTransition();
  const [bundleOn, setBundleOn] = useState(bundle?.active ?? true);
  const [removing, setRemoving] = useState<string | null>(null);
  const [brand, setBrand] = useState(brands[0]?.brand ?? "");
  const current = brands.find((b) => b.brand === brand);

  const toggleCode = (c: CodeRow) => start(async () => setRowRes(await setCodeActive(c.id, !c.active)));
  const remove = (c: CodeRow) => {
    if (removing !== c.id) return setRemoving(c.id);
    setRemoving(null);
    start(async () => setRowRes(await removeCode(c.id)));
  };
  const until = (c: CodeRow) =>
    [c.endDay ? t("until", { day: c.endDay }) : t("noEnd"), c.usageLimit ? t("usedOf", { used: c.used, limit: c.usageLimit }) : t("usedTimes", { used: c.used })].join(" · ");

  return (
    <>
      <div className="mb-[18px]">
        <h1 className="m-0 font-[family-name:var(--font-cormorant)] text-[28px] font-semibold leading-tight text-emerald md:text-[34px]">{t("title")}</h1>
        <p className="m-0 text-[14px] text-muted">{t("sub")}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Bundle */}
        <section aria-labelledby="bundle" className={panel}>
          <h2 id="bundle" className={h2}>
            {t("bundleTitle")}
          </h2>
          <form onSubmit={bundleAct} className="flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
              <Toggle on={bundleOn} label={t("bundleOn")} onChange={() => setBundleOn((v) => !v)} />
              <span className="text-[14px]">{t("bundleText")}</span>
              {bundleOn && <input type="hidden" name="active" value="on" />}
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <label className={label}>
                {t("minSuits")}
                <input name="qty" type="number" inputMode="numeric" min="2" max="20" defaultValue={bundle?.qty ?? 3} required className={field} />
              </label>
              <label className={label}>
                {t("discountPct")}
                <input name="pct" type="number" inputMode="numeric" min="1" max="50" defaultValue={bundle?.pct ?? 10} required className={field} />
              </label>
            </div>
            <button type="submit" disabled={bundleBusy} className={primary}>
              {t("saveBundle")}
            </button>
            <ResultLine result={bundleRes} ns="offers" />
          </form>
        </section>

        {/* Brand-wide sale */}
        <section aria-labelledby="brandsale" className={panel}>
          <h2 id="brandsale" className={h2}>
            {t("brandSaleTitle")}
          </h2>
          <form onSubmit={saleAct} className="flex flex-col gap-3">
            <div className="grid grid-cols-[1fr_110px] gap-2.5">
              <label className={label}>
                {t("brand")}
                <select name="brand" value={brand} onChange={(e) => setBrand(e.target.value)} className={field}>
                  {brands.map((b) => (
                    <option key={b.brand} value={b.brand}>
                      {b.brand}
                    </option>
                  ))}
                </select>
              </label>
              <label className={label}>
                {t("salePct")}
                <input name="pct" type="number" inputMode="numeric" min="0" max="90" defaultValue={15} required className={field} />
              </label>
            </div>
            {current && (
              <p className="m-0 text-[13px] text-muted">
                {t("brandNow", { suits: current.suits, onSale: current.onSale })}
                {current.salePct ? ` · ${t("brandAllAt", { pct: current.salePct })}` : ""}
              </p>
            )}
            <button type="submit" disabled={saleBusy} className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-rani px-4 text-[15px] font-medium text-white disabled:opacity-60">
              {t("applyBrand")}
            </button>
            <p className="m-0 text-[12px] text-muted">{t("brandHint")}</p>
            <ResultLine result={saleRes} ns="offers" />
          </form>
        </section>
      </div>

      {/* Codes */}
      <section aria-labelledby="codes" className={`${panel} mt-4`}>
        <h2 id="codes" className={h2}>
          {t("codesTitle")} <small className="font-normal text-muted">· {t("codesHint")}</small>
        </h2>
        {codes.length === 0 ? (
          <p className="m-0 text-[14px] text-muted">{t("noCodes")}</p>
        ) : (
          <ul className="m-0 flex list-none flex-col p-0">
            {codes.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-[#F0EBE1] py-2.5 last:border-b-0">
                <span className="min-w-[150px] flex-1">
                  <b className="font-semibold tracking-wide text-emerald" dir="ltr">
                    {c.code}
                  </b>{" "}
                  <span className="tabular-nums">· {c.percent}%</span> <span className={`${chip} ${TONE[c.state]}`}>{t(`state.${c.state}`)}</span>
                  <small className="block text-muted">
                    {c.note && (
                      <>
                        <bdi>{c.note}</bdi> ·{" "}
                      </>
                    )}
                    {until(c)}
                  </small>
                </span>
                <Toggle on={c.active} label={t("codeActive", { code: c.code })} onChange={() => toggleCode(c)} />
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => remove(c)}
                  className="min-h-[34px] rounded-full border border-rani/40 bg-white px-3 text-[13px] font-medium text-rani disabled:opacity-60"
                >
                  {removing === c.id ? t("confirmRemove") : t("remove")}
                </button>
              </li>
            ))}
          </ul>
        )}
        <ResultLine result={rowRes} ns="offers" />

        <form onSubmit={codeAct} className="mt-3 flex flex-col gap-3 border-t border-[#F0EBE1] pt-3">
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-5">
            <label className={label}>
              {t("newCode")}
              <input name="code" required maxLength={32} dir="ltr" placeholder="EID15" className={`${field} uppercase`} key={codeRes.ok ? `c${codeRes.at}` : "c"} />
            </label>
            <label className={label}>
              {t("discountPct")}
              <input name="pct" type="number" inputMode="numeric" min="1" max="90" defaultValue={15} required className={field} />
            </label>
            <label className={`${label} col-span-2 md:col-span-1`}>
              {t("note")}
              <input name="note" maxLength={80} placeholder={t("notePh")} className={field} key={codeRes.ok ? `n${codeRes.at}` : "n"} />
            </label>
            <label className={label}>
              {t("endDay")}
              <input name="endDay" type="date" min={today} className={field} />
            </label>
            <label className={label}>
              {t("limit")}
              <input name="limit" type="number" inputMode="numeric" min="1" placeholder={t("noLimit")} className={field} />
            </label>
          </div>
          <button type="submit" disabled={codeBusy} className={`${primary} self-start`}>
            {t("addCode")}
          </button>
          <ResultLine result={codeRes} ns="offers" />
        </form>
      </section>
    </>
  );
}
