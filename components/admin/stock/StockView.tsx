"use client";

import Image from "next/image";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { photoUrl } from "@/lib/product";
import type { StockRow } from "@/lib/admin/stock";
import { adjustStock, receiveShipment, type ReceiveState, type StockResult } from "@/app/admin/(panel)/stock/actions";

type Props = { products: StockRow[]; lowLevel: number };

const panel = "min-w-0 rounded-[18px] border border-[#E1E6DF] bg-white p-[18px] shadow-[0_6px_18px_rgba(14,59,46,0.05)]";
const chip = "inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium";
const stepBtn =
  "inline-flex h-[38px] w-[38px] items-center justify-center rounded-full border border-[#CFC3AA] bg-white text-[18px] font-medium text-emerald disabled:opacity-40";
const field = "min-h-[44px] w-full min-w-0 rounded-xl border border-[#DDD3C0] bg-white px-3 text-[15px] text-ink focus:border-gold focus:outline-none";

export default function StockView({ products, lowLevel }: Props) {
  const t = useTranslations("Admin.stock");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; bad?: boolean } | null>(null);
  const [, start] = useTransition();
  const [received, receive, receiving] = useActionState<ReceiveState, FormData>(receiveShipment, {});
  const [suit, setSuit] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const qtyRef = useRef<HTMLInputElement>(null);

  const soldOut = products.filter((p) => p.stock <= 0);
  const low = products.filter((p) => p.stock > 0 && p.stock <= lowLevel).sort((a, b) => a.stock - b.stock);

  const say = (r: StockResult) =>
    setMessage(r.ok ? { text: t("updated", { name: r.name, stock: r.stock }) } : { text: t(`errors.${r.error}`), bad: true });

  useEffect(() => {
    const r = received.result;
    if (!r) return;
    if (r.ok) {
      setMessage({ text: `${t("receivedMsg", { name: r.name, stock: r.stock })}${r.waiting ? ` ${t("waiting", { count: r.waiting })}` : ""}` });
      setSuit("");
    } else setMessage({ text: t(`errors.${r.error}`), bad: true });
  }, [received, t]);

  const step = (p: StockRow, d: 1 | -1) => {
    setBusyId(p.id);
    start(async () => {
      say(await adjustStock(p.id, d));
      setBusyId(null);
    });
  };
  const receiveFor = (p: StockRow) => {
    setSuit(p.id);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    qtyRef.current?.focus({ preventScroll: true });
  };

  const status = (p: StockRow) =>
    p.stock <= 0 ? (
      <span className={`${chip} bg-[#5C635F] text-white`}>{t("statusOut")}</span>
    ) : p.stock <= lowLevel ? (
      <span className={`${chip} bg-[#FBE7EE] text-rani`}>{t("statusLow")}</span>
    ) : (
      <span className={`${chip} bg-[#E3F1E8] text-[#1E6B43]`}>{t("statusOk")}</span>
    );
  const thumb = (p: StockRow) => (
    <span className="relative block h-[56px] w-[44px] shrink-0 overflow-hidden rounded-t-[22px] rounded-b-md border border-[#E7E1D4]" style={{ background: p.colour }}>
      {p.photo && <Image src={photoUrl(p.photo)} alt="" fill sizes="44px" className="object-cover object-[center_20%]" />}
    </span>
  );
  const steppers = (p: StockRow) => (
    <span className="flex items-center gap-1.5">
      <button type="button" className={stepBtn} onClick={() => step(p, -1)} disabled={busyId === p.id || p.stock <= 0} aria-label={t("oneLess", { name: p.name })}>
        −
      </button>
      <button type="button" className={stepBtn} onClick={() => step(p, 1)} disabled={busyId === p.id} aria-label={t("oneMore", { name: p.name })}>
        +
      </button>
    </span>
  );
  const nameCell = (p: StockRow) => (
    <span className="min-w-0">
      <b className="block font-medium leading-tight text-emerald">
        <bdi>{p.name}</bdi>
      </b>
      <small className="text-muted">
        <bdi>{p.brand}</bdi> · <bdi dir="ltr">{p.code}</bdi>
        {!p.visible && <span className={`${chip} ms-1.5 bg-[#EEF2EE] text-muted`}>{t("hidden")}</span>}
      </small>
    </span>
  );

  return (
    <>
      <div className="mb-[18px]">
        <h1 className="m-0 font-[family-name:var(--font-cormorant)] text-[28px] font-semibold leading-tight text-emerald md:text-[34px]">{t("title")}</h1>
        <p className="m-0 text-[14px] text-muted">{t("sub", { out: soldOut.length, low: low.length, level: lowLevel })}</p>
      </div>

      <p role="status" aria-live="polite" className={`m-0 mb-3 min-h-[20px] text-[14px] ${message?.bad ? "text-rani" : "text-emerald"}`}>
        {message?.text}
      </p>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">
        <section aria-labelledby="levels" className={panel}>
          <h2 id="levels" className="m-0 mb-3 text-[16px] font-semibold text-emerald">
            {t("levels")} <small className="font-normal text-muted">· {t("lowIs", { level: lowLevel })}</small>
          </h2>
          {/* Phone */}
          <ul className="m-0 flex list-none flex-col p-0 md:hidden">
            {products.map((p) => (
              <li key={p.id} className="flex items-center gap-3 border-b border-[#F0EBE1] py-2.5 last:border-b-0">
                {thumb(p)}
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  {nameCell(p)}
                  {status(p)}
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1.5">
                  <b className="text-[20px] font-semibold tabular-nums text-emerald">{p.stock}</b>
                  {steppers(p)}
                </span>
              </li>
            ))}
          </ul>
          {/* Tablet and desktop */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full border-collapse text-[14px]">
              <thead>
                <tr>
                  {(["", "colSuit", "colStock", "colAdjust", "colStatus"] as const).map((c, i) => (
                    <th key={i} className="th-caps whitespace-nowrap border-b border-[#E7E1D4] px-2 py-2 text-start text-[11px] font-semibold uppercase tracking-[0.1em] text-gold-ink">
                      {c && t(c)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-[#FAF8F3]">
                    <td className="border-b border-[#F0EBE1] px-2 py-2">{thumb(p)}</td>
                    <td className="border-b border-[#F0EBE1] px-2 py-2">{nameCell(p)}</td>
                    <td className="border-b border-[#F0EBE1] px-2 py-2 text-[18px] font-semibold tabular-nums text-emerald">{p.stock}</td>
                    <td className="border-b border-[#F0EBE1] px-2 py-2">{steppers(p)}</td>
                    <td className="border-b border-[#F0EBE1] px-2 py-2">{status(p)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="flex min-w-0 flex-col gap-4">
          <section aria-labelledby="receive" className={panel}>
            <h2 id="receive" className="m-0 mb-3 text-[16px] font-semibold text-emerald">
              {t("receiveTitle")}
            </h2>
            <form ref={formRef} action={receive} className="flex flex-col gap-3">
              <label className="flex flex-col gap-1.5 text-[13px] text-muted">
                {t("suit")}
                <select name="productId" required value={suit} onChange={(e) => setSuit(e.target.value)} className={field}>
                  <option value="">{t("chooseSuit")}</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.brand} · {p.name} ({p.stock})
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <label className="flex min-w-0 flex-col gap-1.5 text-[13px] text-muted">
                  {t("qty")}
                  <input
                    ref={qtyRef}
                    key={received.result?.ok ? `q-${received.result.stock}` : "q"}
                    name="qty"
                    type="number"
                    inputMode="numeric"
                    min="1"
                    max="1000"
                    step="1"
                    required
                    defaultValue={received.values?.qty ?? ""}
                    className={field}
                  />
                </label>
                <label className="flex min-w-0 flex-col gap-1.5 text-[13px] text-muted">
                  {t("reference")}
                  <input
                    key={received.result?.ok ? `r-${received.result.stock}` : "r"}
                    name="reference"
                    maxLength={60}
                    dir="ltr"
                    placeholder="PK-LHE-2611"
                    defaultValue={received.values?.reference ?? ""}
                    className={field}
                  />
                </label>
              </div>
              <button type="submit" disabled={receiving} className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-emerald bg-emerald px-4 text-[15px] font-medium text-ivory-white disabled:opacity-70">
                {receiving ? t("adding") : t("addToStock")}
              </button>
            </form>
            <p className="m-0 mt-2.5 text-[12px] text-muted">{t("receiveNote")}</p>
          </section>

          <section aria-labelledby="alerts" className={panel}>
            <h2 id="alerts" className="m-0 mb-1 text-[16px] font-semibold text-emerald">
              {t("alerts")}
            </h2>
            <ul className="m-0 list-none p-0">
              {soldOut.length + low.length === 0 && <li className="py-2 text-[14px] text-muted">{t("allStocked")}</li>}
              {[...soldOut, ...low].map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 border-b border-[#F0EBE1] py-2 text-[14px] last:border-b-0">
                  <span className="min-w-0">
                    {p.stock <= 0 ? (
                      <span className={`${chip} bg-[#5C635F] text-white`}>{t("soldOut")}</span>
                    ) : (
                      <span className={`${chip} bg-[#FBE7EE] text-rani`}>{t("left", { count: p.stock })}</span>
                    )}{" "}
                    <bdi>{p.name}</bdi>
                  </span>
                  <button type="button" onClick={() => receiveFor(p)} className="inline-flex min-h-[34px] shrink-0 items-center rounded-full border border-[#CFC3AA] bg-white px-3 text-[13px] font-medium text-emerald">
                    {t("restock")}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}
