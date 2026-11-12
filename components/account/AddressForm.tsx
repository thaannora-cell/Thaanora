"use client";

import dynamic from "next/dynamic";
import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { saveAddress, type AddressState } from "@/app/[locale]/account/actions";
import { useAreaLabel } from "@/components/storefront/useAreaLabel";
import type { Address } from "@/lib/customer/addresses";

// The map only exists in the browser.
const MapPicker = dynamic(() => import("./MapPicker"), { ssr: false, loading: () => <div className="h-[260px] w-full rounded-xl border border-line bg-ivory" /> });

const label = "flex min-w-0 flex-col gap-1.5 text-[13px] text-muted";

type Props = {
  address: Address | null; // null = new address
  areas: string[];
  me: { name: string; phone: string }; // her own name and mobile, for a new address
};

export default function AddressForm({ address, areas, me }: Props) {
  const t = useTranslations("Addresses");
  const locale = useLocale();
  const areaLabel = useAreaLabel();
  const [state, act, busy] = useActionState<AddressState, FormData>(saveAddress, {});
  const bad = (f: string) => (state.field === f ? true : undefined);
  const localPhone = (p: string | null) => (p ? `0${p.slice(4)}` : "");

  return (
    <form action={act} className="flex flex-col gap-3.5">
      <input type="hidden" name="locale" value={locale} />
      {address && <input type="hidden" name="id" value={address.id} />}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className={label}>
          {t("label")}
          <input name="label" required maxLength={40} list="address-labels" defaultValue={address?.label ?? t("home")} aria-invalid={bad("label")} className="th-field text-[16px]" />
          <datalist id="address-labels">
            <option value={t("home")} />
            <option value={t("work")} />
            <option value={t("family")} />
          </datalist>
        </label>
        <label className={label}>
          {t("area")}
          <select name="area" required defaultValue={address?.area ?? ""} aria-invalid={bad("area")} className="th-field text-[16px]">
            <option value="" disabled>
              {t("chooseArea")}
            </option>
            {areas.map((a) => (
              <option key={a} value={a}>
                {areaLabel(a)}
              </option>
            ))}
          </select>
        </label>
        <label className={label}>
          {t("recipientName")}
          <input name="recipientName" required maxLength={80} defaultValue={address?.recipientName ?? me.name} aria-invalid={bad("recipientName")} className="th-field text-[16px]" />
        </label>
        <label className={label}>
          {t("recipientPhone")}
          <input name="recipientPhone" type="tel" inputMode="tel" dir="ltr" placeholder="05X XXX XXXX" defaultValue={address ? localPhone(address.recipientPhone) : localPhone(me.phone)} aria-invalid={bad("recipientPhone")} className="th-field text-start text-[16px]" />
        </label>
        <label className={label}>
          {t("district")}
          <input name="district" maxLength={80} defaultValue={address?.district ?? ""} className="th-field text-[16px]" />
        </label>
        <label className={`${label} sm:col-span-2`}>
          {t("details")}
          <textarea name="details" maxLength={300} rows={2} defaultValue={address?.details ?? ""} placeholder={t("detailsPlaceholder")} className="th-field min-h-[70px] text-[16px]" />
        </label>
      </div>

      <fieldset className="m-0 flex flex-col gap-1.5 border-0 p-0">
        <legend className="mb-1 p-0 text-[13px] text-muted">{t("pin")}</legend>
        <MapPicker lat={address?.lat ?? null} lng={address?.lng ?? null} />
      </fieldset>

      <label className="th-opt items-center">
        <input type="checkbox" name="isDefault" defaultChecked={address?.isDefault ?? false} />
        <span className="text-[14px]">{t("makeDefault")}</span>
      </label>
      <label className="th-opt items-center">
        <input type="checkbox" name="isGift" defaultChecked={address?.isGift ?? false} />
        <span className="text-[14px]">
          {t("isGift")}
          <small className="block text-[12px] text-muted">{t("isGiftNote")}</small>
        </span>
      </label>

      {state.error && (
        <p role="alert" className="m-0 text-[14px] text-rani">
          {t(`errors.${state.error}`)}
        </p>
      )}
      <button type="submit" disabled={busy} className="th-btn th-btn-pink justify-center disabled:opacity-60">
        {busy ? t("saving") : t("save")}
      </button>
    </form>
  );
}
