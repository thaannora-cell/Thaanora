"use client";

import Image from "next/image";
import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { photoUrl, salePrice } from "@/lib/product";
import type { AdminProduct } from "@/lib/admin/products";
import { setVisible } from "@/app/admin/(panel)/products/actions";
import ProductEditor from "./ProductEditor";
import Toggle from "./Toggle";

type Props = { products: AdminProduct[]; rate: number | null; lowLevel: number; brandOfMonth: string | null; lang: "en" | "ar" };

const nf = (lang: string) => new Intl.NumberFormat(lang === "ar" ? "ar-SA-u-nu-latn" : "en-GB", { maximumFractionDigits: 0 });

export function marginPct(price: number, salePct: number, costPkr: number | null, rate: number | null): number | null {
  const sell = salePrice({ price_sar: price, sale_pct: salePct });
  if (!rate || costPkr === null || !(sell > 0)) return null;
  return Math.round(((sell - costPkr / rate) / sell) * 100);
}

const chip = "inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium";

export default function ProductsView({ products, rate, lowLevel, brandOfMonth, lang }: Props) {
  const t = useTranslations("Admin.products");
  const tm = useTranslations("Admin");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<AdminProduct | "new" | null>(null);
  const [visibleNow, setVisibleNow] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<{ text: string; bad?: boolean } | null>(null);
  const [, start] = useTransition();
  const n = nf(lang);
  const sar = (v: number) => tm("money", { amount: n.format(v) });

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? products.filter((p) => `${p.brand} ${p.name} ${p.code} ${p.fabric}`.toLowerCase().includes(q)) : products;
  }, [products, query]);
  const isVisible = (p: AdminProduct) => visibleNow[p.id] ?? p.visible;
  const shown = products.filter(isVisible).length;

  const toggle = (p: AdminProduct) => {
    const next = !isVisible(p);
    setVisibleNow((v) => ({ ...v, [p.id]: next }));
    start(async () => {
      const r = await setVisible(p.id, next);
      if (!r.ok) {
        setVisibleNow((v) => ({ ...v, [p.id]: !next }));
        setToast({ text: t("errors.saveFailed"), bad: true });
      } else setToast({ text: next ? t("nowShowing", { name: p.name }) : t("nowHidden", { name: p.name }) });
    });
  };

  const stockChip = (s: number) =>
    s <= 0 ? <span className={`${chip} bg-[#5C635F] text-white`}>0</span> : s <= lowLevel ? <span className={`${chip} bg-[#FBE7EE] text-rani`}>{s}</span> : <span className="tabular-nums">{s}</span>;
  const labels = (p: AdminProduct) => (
    <span className="flex flex-wrap gap-1">
      {p.on_rack && <span className={`${chip} border border-gold bg-white text-gold-ink`}>{t("labelRack")}</span>}
      {p.is_pick && <span className={`${chip} bg-[#FBE7EE] text-rani`}>{t("labelPick")}</span>}
      {p.is_new && <span className={`${chip} bg-gold text-emerald`}>{t("labelNew")}</span>}
      {p.trending_rank && <span className={`${chip} bg-emerald text-gold-light`}>#{p.trending_rank}</span>}
      {brandOfMonth && p.brand === brandOfMonth && <span className={`${chip} bg-[#EEF2EE] text-emerald`}>{t("labelBrandOfMonth")}</span>}
      {p.sale_pct > 0 && <span className={`${chip} bg-rani text-white`}>−{p.sale_pct}%</span>}
    </span>
  );
  const thumb = (p: AdminProduct, cls: string) => {
    const ph = p.product_images[0];
    return (
      <span className={`relative block shrink-0 overflow-hidden rounded-t-[22px] rounded-b-md border border-[#E7E1D4] ${cls}`} style={{ background: p.colour_hex }}>
        {ph && <Image src={photoUrl(ph.storage_path)} alt="" fill sizes="56px" className="object-cover object-[center_20%]" />}
      </span>
    );
  };
  const price = (p: AdminProduct) => (
    <span className="whitespace-nowrap tabular-nums">
      {p.sale_pct > 0 && <s className="me-1 text-[#888]">{n.format(p.price_sar)}</s>}
      <b className="font-semibold">{sar(salePrice(p))}</b>
    </span>
  );
  const margin = (p: AdminProduct) => {
    const m = marginPct(p.price_sar, p.sale_pct, p.cost_pkr, rate);
    return m === null ? "—" : <span className={m < 20 ? "text-rani" : ""}>{m}%</span>;
  };

  return (
    <>
      <div className="mb-[18px] flex flex-wrap items-center gap-3">
        <div className="min-w-0">
          <h1 className="m-0 font-[family-name:var(--font-cormorant)] text-[28px] font-semibold leading-tight text-emerald md:text-[34px]">{t("title")}</h1>
          <p className="m-0 text-[14px] text-muted">
            {t("sub", { total: products.length, visible: shown })} · {t("rackCounter", { used: products.filter((p) => p.on_rack).length, max: 17 })}
          </p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:ms-auto sm:w-auto">
          <label className="min-w-0 flex-1 sm:w-[240px] sm:flex-none">
            <span className="sr-only">{t("search")}</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("search")}
              className="min-h-[42px] w-full rounded-full border border-[#DDD3C0] bg-white px-4 text-[15px] focus:border-gold focus:outline-none"
            />
          </label>
          <button type="button" onClick={() => setEditing("new")} className="inline-flex min-h-[42px] items-center rounded-full border border-emerald bg-emerald px-4 text-[14px] font-medium text-ivory-white">
            {t("add")}
          </button>
        </div>
      </div>

      <p role="status" aria-live="polite" className={`m-0 mb-3 min-h-[20px] text-[14px] ${toast?.bad ? "text-rani" : "text-emerald"}`}>
        {toast?.text}
      </p>

      <section className="min-w-0 rounded-[18px] border border-[#E1E6DF] bg-white p-3 shadow-[0_6px_18px_rgba(14,59,46,0.05)] md:p-[18px]">
        {list.length === 0 && <p className="m-0 p-2 text-[14px] text-muted">{t("noMatch")}</p>}

        {/* Phone: one card per suit */}
        <ul className="m-0 flex list-none flex-col p-0 lg:hidden">
          {list.map((p) => (
            <li key={p.id} className="flex gap-3 border-b border-[#F0EBE1] py-3 last:border-b-0">
              {thumb(p, "h-[72px] w-[56px]")}
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <b className="font-medium leading-tight text-emerald">
                  <bdi>{p.name}</bdi>
                </b>
                <small className="text-muted">
                  <bdi>{p.brand}</bdi> · <bdi dir="ltr">{p.code}</bdi>
                </small>
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
                  {price(p)}
                  <span className="text-muted">
                    {t("colStock")}: {stockChip(p.stock)}
                  </span>
                  <span className="text-muted">
                    {t("colMargin")}: {margin(p)}
                  </span>
                </span>
                {labels(p)}
              </div>
              <div className="flex shrink-0 flex-col items-end justify-between gap-2">
                <Toggle on={isVisible(p)} label={t("visibleOn", { name: p.name })} onChange={() => toggle(p)} />
                <button type="button" onClick={() => setEditing(p)} className="min-h-[34px] rounded-full border border-[#CFC3AA] bg-white px-3 text-[13px] font-medium text-emerald">
                  {t("edit")}
                </button>
              </div>
            </li>
          ))}
        </ul>

        {/* Desktop: the prototype table */}
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[900px] border-collapse text-[14px]">
            <thead>
              <tr>
                {(["", "colSuit", "colPrice", "colSale", "colCost", "colMargin", "colStock", "colLabels", "colVisible", ""] as const).map((c, i) => (
                  <th key={i} className="th-caps whitespace-nowrap border-b border-[#E7E1D4] px-2 py-2 text-start text-[11px] font-semibold uppercase tracking-[0.1em] text-gold-ink">
                    {c && t(c)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id} className={`hover:bg-[#FAF8F3] ${isVisible(p) ? "" : "opacity-60"}`}>
                  <td className="border-b border-[#F0EBE1] px-2 py-2">{thumb(p, "h-[56px] w-[44px]")}</td>
                  <td className="border-b border-[#F0EBE1] px-2 py-2">
                    <b className="block font-medium text-emerald">
                      <bdi>{p.name}</bdi>
                    </b>
                    <small className="text-muted">
                      <bdi>{p.brand}</bdi> · <bdi dir="ltr">{p.code}</bdi>
                    </small>
                  </td>
                  <td className="border-b border-[#F0EBE1] px-2 py-2">{price(p)}</td>
                  <td className="border-b border-[#F0EBE1] px-2 py-2 tabular-nums">{p.sale_pct ? `${p.sale_pct}%` : "—"}</td>
                  <td className="border-b border-[#F0EBE1] px-2 py-2 tabular-nums">{p.cost_pkr === null ? "—" : n.format(p.cost_pkr)}</td>
                  <td className="border-b border-[#F0EBE1] px-2 py-2 tabular-nums">{margin(p)}</td>
                  <td className="border-b border-[#F0EBE1] px-2 py-2">{stockChip(p.stock)}</td>
                  <td className="border-b border-[#F0EBE1] px-2 py-2">{labels(p)}</td>
                  <td className="border-b border-[#F0EBE1] px-2 py-2">
                    <Toggle on={isVisible(p)} label={t("visibleOn", { name: p.name })} onChange={() => toggle(p)} />
                  </td>
                  <td className="border-b border-[#F0EBE1] px-2 py-2">
                    <button type="button" onClick={() => setEditing(p)} className="min-h-[34px] rounded-full border border-[#CFC3AA] bg-white px-3 text-[13px] font-medium text-emerald">
                      {t("edit")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="m-0 mt-2.5 px-1 text-[12px] text-muted">{rate ? t("marginNote", { rate: rate }) : t("marginNoRate")}</p>
      </section>

      {editing && (
        <ProductEditor
          product={editing === "new" ? null : editing}
          products={products}
          rate={rate}
          onClose={() => setEditing(null)}
          onSaved={(text) => {
            setEditing(null);
            setToast({ text });
          }}
        />
      )}
    </>
  );
}
