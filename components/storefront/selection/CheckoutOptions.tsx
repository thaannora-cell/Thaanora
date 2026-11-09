"use client";

import { useTranslations } from "next-intl";
import { useSelection } from "./SelectionProvider";
import { useAreaLabel } from "../useAreaLabel";

export default function CheckoutOptions() {
  const sel = useSelection();
  const t = useTranslations("Checkout");
  const tRack = useTranslations("Rack");
  const areaLabel = useAreaLabel();
  if (!sel) return null;
  const { checkout, updateCheckout, settings } = sel;
  const price = (n: number) => tRack("price", { amount: n });

  return (
    <div className="flex flex-col gap-3">
      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="th-caps mb-1 text-[11px] font-medium uppercase tracking-[0.16em] text-gold-ink">{t("packaging")}</legend>
        <label className="th-opt">
          <input
            type="radio"
            name="packaging"
            checked={checkout.packaging === "suit_keeper_bag"}
            onChange={() => updateCheckout({ packaging: "suit_keeper_bag" })}
          />
          <span>
            {t("keeperBag")}
            <small className="block text-[12px] text-muted">{t("keeperBagNote")}</small>
          </span>
        </label>
        <label className="th-opt">
          <input
            type="radio"
            name="packaging"
            checked={checkout.packaging === "gift_box"}
            onChange={() => updateCheckout({ packaging: "gift_box" })}
          />
          <span>
            {t("giftBox", { fee: price(settings.giftBoxFee) })}
            <small className="block text-[12px] text-muted">{t("giftBoxNote")}</small>
          </span>
        </label>
      </fieldset>

      <label className="th-opt">
        <input type="checkbox" checked={checkout.isGift} onChange={(e) => updateCheckout({ isGift: e.target.checked })} />
        <span>
          {t("isGift")}
          <small className="block text-[12px] text-muted">{t("isGiftNote")}</small>
        </span>
      </label>

      {checkout.isGift && (
        <div className="flex flex-col gap-3 rounded-[14px] border border-line bg-white/60 p-3">
          <label className="flex flex-col gap-1.5 text-[13px] text-muted">
            {t("recipientName")}
            <input
              className="th-field"
              dir="auto"
              value={checkout.recipientName}
              maxLength={80}
              autoComplete="off"
              onChange={(e) => updateCheckout({ recipientName: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-[13px] text-muted">
            {t("recipientArea")}
            <input
              className="th-field"
              dir="auto"
              value={checkout.recipientArea}
              maxLength={80}
              placeholder={t("recipientAreaPlaceholder")}
              onChange={(e) => updateCheckout({ recipientArea: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-[13px] text-muted">
            {t("cardMessage")}
            <textarea
              className="th-field min-h-[76px] resize-y"
              dir="auto"
              value={checkout.giftNote}
              maxLength={300}
              onChange={(e) => updateCheckout({ giftNote: e.target.value })}
            />
          </label>
        </div>
      )}

      <label className="flex flex-col gap-1.5 text-[13px] text-muted">
        {t("deliveryArea")}
        <select
          className="th-field"
          value={checkout.area}
          onChange={(e) => updateCheckout({ area: e.target.value })}
          aria-describedby={checkout.area ? undefined : "area-hint"}
        >
          <option value="" disabled>
            {t("chooseArea")}
          </option>
          {settings.areas.map((a) => (
            <option key={a.area} value={a.area}>
              {areaLabel(a.area)} · {a.fee > 0 ? price(a.fee) : t("free")}
            </option>
          ))}
        </select>
        {!checkout.area && (
          <span id="area-hint" className="text-[12px] text-muted">
            {t("areaHint")}
          </span>
        )}
      </label>
    </div>
  );
}
