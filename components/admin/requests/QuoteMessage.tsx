"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { fillTemplate } from "@/lib/wa-templates";

type Props = {
  template: string; // the "Sourcing quote" template in the customer's language
  values: { name: string; ref: string; what: string; shopNumber: string };
  phone: string; // customer's number, digits only
  locale: string; // the customer's language, for number formatting
  pricePattern: string; // e.g. "SAR {amount}" in the customer's language
};

// Staff type the price and delivery time; the quote is filled in live and opened in WhatsApp.
export default function QuoteMessage({ template, values, phone, locale, pricePattern }: Props) {
  const t = useTranslations("Admin.requests");
  const [price, setPrice] = useState("");
  const [days, setDays] = useState("");
  const p = Number(price);
  const d = Number(days);
  const ready = p > 0 && p < 100000 && Number.isInteger(d) && d > 0 && d < 366;
  const fmt = (n: number) => new Intl.NumberFormat(locale).format(n);
  const text = ready
    ? fillTemplate(template, { ...values, price: pricePattern.replace("{amount}", fmt(p)), days: fmt(d) })
    : "";
  const field =
    "min-h-[44px] w-full min-w-0 rounded-xl border border-[#DDD3C0] bg-white px-3 text-[15px] text-ink focus:border-gold focus:outline-none";

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <label className="flex min-w-0 flex-col gap-1.5 text-[13px] text-muted">
          {t("quotePrice")}
          <input type="number" inputMode="decimal" min="1" step="1" value={price} onChange={(e) => setPrice(e.target.value)} className={field} />
        </label>
        <label className="flex min-w-0 flex-col gap-1.5 text-[13px] text-muted">
          {t("quoteDays")}
          <input type="number" inputMode="numeric" min="1" max="365" step="1" value={days} onChange={(e) => setDays(e.target.value)} className={field} />
        </label>
      </div>
      {ready ? (
        <>
          <pre className="m-0 whitespace-pre-wrap rounded-xl bg-[#F4F7F4] p-3 font-[family-name:var(--font-jost)] text-[13px] text-ink" dir="auto">
            {text}
          </pre>
          <a
            href={`https://wa.me/${phone}?text=${encodeURIComponent(text)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] items-center self-start rounded-full bg-rani px-5 text-[15px] font-medium text-white no-underline"
          >
            {t("quoteSend")}
          </a>
        </>
      ) : (
        <p className="m-0 text-[13px] text-muted">{t("quoteFill")}</p>
      )}
    </div>
  );
}
