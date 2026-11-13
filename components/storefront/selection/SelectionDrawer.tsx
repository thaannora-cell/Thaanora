"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { photoUrl, salePrice } from "@/lib/product";
import { useSelection } from "./SelectionProvider";
import { useNativeClose } from "@/components/ui/Modal";
import CheckoutOptions from "./CheckoutOptions";
import SendOrder from "./SendOrder";
import { useAreaLabel } from "../useAreaLabel";

// The first-order cash-on-delivery limit from the prototype; bigger orders are confirmed by phone.
const COD_FIRST_ORDER_LIMIT = 3;

export default function SelectionDrawer() {
  const sel = useSelection();
  const t = useTranslations("Selection");
  const tRack = useTranslations("Rack");
  const tCheckout = useTranslations("Checkout");
  const tCircle = useTranslations("Circle");
  const areaLabel = useAreaLabel();
  const ref = useRef<HTMLDialogElement>(null);
  const [codeInput, setCodeInput] = useState("");
  const [codeState, setCodeState] = useState<"idle" | "busy" | "invalid" | "error" | "tooMany">("idle");

  const open = sel?.drawerOpen ?? false;
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  useNativeClose(ref, open, () => sel?.closeDrawer());

  if (!sel) return null;
  const { lines, products, bundle, totals, appliedCode, checkout, settings } = sel;
  const price = (n: number) => tRack("price", { amount: n });
  // One discount per order (the best one), on full-price suits only.
  const discountLabel = (d: NonNullable<typeof totals.discount>) =>
    d.kind === "bundle"
      ? t("bundleLine", { qty: d.minQty ?? bundle?.qty ?? 0, pct: d.pct })
      : d.kind === "code"
        ? t("codeLine", { code: d.ref ?? "" })
        : d.kind === "loyalty"
          ? t("loyaltyLine", { level: tCircle.has(`levels.${d.ref}`) ? tCircle(`levels.${d.ref}`) : (d.ref ?? ""), pct: d.pct })
          : d.kind === "birthday"
            ? t("birthdayLine", { pct: d.pct })
            : t("personalLine", { pct: d.pct });
  const discountNote =
    [
      appliedCode && totals.discount && totals.discount.kind !== "code" ? t("codeNotUsed", { code: appliedCode.code, best: discountLabel(totals.discount) }) : null,
      (appliedCode || totals.discount) && totals.fullPriceSubtotal < totals.subtotal ? t("saleOnlyNote") : null,
    ]
      .filter(Boolean)
      .join(" ") || null;

  const apply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codeInput.trim()) return;
    setCodeState("busy");
    const r = await sel.applyCode(codeInput);
    if (r === "applied") {
      setCodeInput("");
      setCodeState("idle");
    } else setCodeState(r);
  };

  return (
    <dialog
      ref={ref}
      aria-labelledby="sel-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) sel.closeDrawer();
      }}
      className="th-drawer m-0 ms-auto h-dvh max-h-none w-[min(430px,100%)] max-w-none bg-ivory-white p-0 text-ink"
    >
      <div className="flex min-h-full flex-col gap-3 px-5 pb-[calc(20px+env(safe-area-inset-bottom,0px))] pt-[calc(20px+env(safe-area-inset-top,0px))]">
        <div className="flex items-center justify-between">
          <h3 id="sel-title" className="th-dialog-title m-0 font-[family-name:var(--font-cormorant)] text-[30px] font-semibold text-emerald">
            {t("title")}
          </h3>
          <button
            type="button"
            onClick={sel.closeDrawer}
            aria-label={t("close")}
            className="flex h-[42px] w-[42px] items-center justify-center rounded-full border border-line bg-ivory-white text-[20px] text-emerald"
          >
            ×
          </button>
        </div>

        {sel.placedOrder ? (
          <SendOrder />
        ) : lines.length === 0 ? (
          <p className="my-6 text-center text-[15px] text-muted">{t("empty")}</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
            {lines.map((l) => {
              const p = products.get(l.code);
              if (!p) return null;
              const img = p.product_images[0];
              const unit = salePrice(p);
              return (
                <li key={l.code} className="grid grid-cols-[46px_1fr_auto] items-center gap-3 border-b border-line pb-2.5">
                  <span
                    className="relative block h-14 w-[46px] overflow-hidden rounded-t-[24px] rounded-b"
                    style={{ background: p.colour_hex }}
                  >
                    {img && <Image src={photoUrl(img.storage_path)} alt="" fill sizes="46px" className="object-cover object-[center_20%]" />}
                  </span>
                  <div className="min-w-0 text-[14px] leading-snug">
                    <bdi>{p.name}</bdi>
                    <small className="block text-muted">
                      <bdi>
                        {p.brand}
                        {p.sale_pct > 0 && ` · −${p.sale_pct}%`}
                      </bdi>
                    </small>
                    <div className="mt-1 flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => sel.setQty(l.code, l.qty - 1)}
                        aria-label={l.qty === 1 ? t("remove", { name: p.name }) : t("less", { name: p.name })}
                        className="h-[30px] w-[30px] rounded-full border border-line text-emerald"
                      >
                        −
                      </button>
                      <output className="min-w-[22px] text-center tabular-nums" aria-label={t("qty")}>
                        {l.qty}
                      </output>
                      <button
                        type="button"
                        onClick={() => sel.setQty(l.code, l.qty + 1)}
                        disabled={l.qty >= p.stock}
                        aria-label={t("more", { name: p.name })}
                        className="h-[30px] w-[30px] rounded-full border border-line text-emerald disabled:opacity-40"
                      >
                        +
                      </button>
                      {l.qty >= p.stock && <span className="ms-2 text-[12px] text-muted">{t("maxStock", { n: p.stock })}</span>}
                    </div>
                    <label className="mt-1 flex items-center gap-1.5 text-[12px] text-emerald">
                      <input
                        type="checkbox"
                        checked={l.stitch}
                        onChange={(e) => sel.setStitch(l.code, e.target.checked)}
                        className="accent-[var(--color-emerald)]"
                      />
                      {t("stitch")}
                    </label>
                  </div>
                  <b className="text-[14px] font-medium tabular-nums">{price(unit * l.qty)}</b>
                </li>
              );
            })}
          </ul>
        )}

        {bundle && totals.count > 0 && totals.count < bundle.qty && (
          <p className="m-0 text-[13px] text-rani">{t("addMore", { left: bundle.qty - totals.count, pct: bundle.pct })}</p>
        )}
        {totals.count > COD_FIRST_ORDER_LIMIT && (
          <p className="m-0 rounded-xl border border-[#F0C3D3] bg-[#FBEFF3] px-3 py-2.5 text-[13px] text-[#7A1238]">
            {t("bigOrder", { n: COD_FIRST_ORDER_LIMIT })}
          </p>
        )}

        {lines.length > 0 && (
          <>
            <CheckoutOptions />

            {appliedCode ? (
              <div className="flex items-center justify-between gap-2 rounded-full border border-emerald/30 bg-emerald/5 px-4 py-2 text-[14px]">
                <span>
                  <b dir="ltr" className="font-medium text-emerald">
                    {appliedCode.code}
                  </b>{" "}
                  · {t("codeOff", { pct: appliedCode.percent })}
                </span>
                <button type="button" onClick={sel.removeCode} className="text-[13px] text-emerald underline underline-offset-2">
                  {t("removeCode")}
                </button>
              </div>
            ) : (
              <form onSubmit={apply} className="flex flex-col gap-1.5">
                <div className="flex gap-2">
                  <label className="sr-only" htmlFor="offer-code">
                    {t("codeLabel")}
                  </label>
                  <input
                    id="offer-code"
                    value={codeInput}
                    onChange={(e) => {
                      setCodeInput(e.target.value);
                      if (codeState !== "busy") setCodeState("idle");
                    }}
                    placeholder={t("codePlaceholder")}
                    autoCapitalize="characters"
                    autoComplete="off"
                    dir="ltr"
                    aria-invalid={codeState === "invalid" || undefined}
                    aria-describedby={codeState === "invalid" || codeState === "error" || codeState === "tooMany" ? "code-msg" : undefined}
                    className="min-h-[44px] min-w-0 flex-1 rounded-full border border-line bg-white px-3.5 uppercase text-start focus:border-gold focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={codeState === "busy"}
                    className="min-h-[44px] rounded-full bg-emerald px-4 text-ivory-white disabled:opacity-60"
                  >
                    {t("apply")}
                  </button>
                </div>
                {(codeState === "invalid" || codeState === "error" || codeState === "tooMany") && (
                  <p id="code-msg" role="alert" className="m-0 text-[13px] text-rani">
                    {codeState === "invalid" ? t("codeInvalid") : codeState === "tooMany" ? t("codeTooMany") : t("codeError")}
                  </p>
                )}
              </form>
            )}

            {discountNote && <p className="m-0 text-[13px] text-muted">{discountNote}</p>}

            <dl className="m-0 flex flex-col tabular-nums">
              <Row label={t("subtotal", { n: totals.count })} value={price(totals.subtotal)} />
              {totals.discount && <Row label={discountLabel(totals.discount)} value={`−${price(totals.discount.amount)}`} accent />}
              {totals.packagingFee > 0 && <Row label={tCheckout("giftBoxLine")} value={price(totals.packagingFee)} />}
              <Row
                label={checkout.area ? tCheckout("deliveryLine", { area: areaLabel(checkout.area) }) : tCheckout("deliveryLineNoArea")}
                value={checkout.area ? (totals.deliveryFee > 0 ? price(totals.deliveryFee) : tCheckout("free")) : "—"}
              />
              <div className="mt-1 flex justify-between border-t border-line pt-3 text-[19px] font-medium text-emerald">
                <dt>{checkout.area ? tCheckout("payOnDelivery") : tCheckout("payOnDeliveryNoArea")}</dt>
                <dd className="m-0">{price(totals.total)}</dd>
              </div>
              {settings.vatPct > 0 && (
                <div className="flex justify-between pt-1 text-[13px] text-muted">
                  <dt>{tCheckout("vatIncluded", { pct: settings.vatPct })}</dt>
                  <dd className="m-0">{tRack("price", { amount: totals.vat.toFixed(2) })}</dd>
                </div>
              )}
            </dl>
            <p className="m-0 text-[12px] text-muted">
              {settings.vatPct > 0 ? tCheckout("vatNote", { pct: settings.vatPct }) : tCheckout("noVatNote")}
            </p>
            <p className="m-0 rounded-xl border border-[#BFDCCB] bg-[#E7F3EC] px-3 py-2.5 text-[13px] text-[#1d3a2d]">
              {tCheckout("codNote")}
            </p>
            <SendOrder />
          </>
        )}
      </div>
    </dialog>
  );
}

function Row({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`flex justify-between py-1 text-[15px] ${accent ? "text-rani" : ""}`}>
      <dt>{label}</dt>
      <dd className="m-0">{value}</dd>
    </div>
  );
}
