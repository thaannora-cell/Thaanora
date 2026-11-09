"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

export type SentRequest = { reference: string; message: string; whatsappUrl: string | null };

// Shown after a request is saved: the prepared WhatsApp message, ready to send or copy.
export default function RequestSent({ sent, title, text }: { sent: SentRequest; title: string; text: string }) {
  const t = useTranslations("Requests");
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(sent.message);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-[18px] border border-[#BFDCCB] bg-[#E7F3EC] p-4 text-[#1d3a2d]" role="status">
      <p className="m-0 text-[15px] font-medium">
        {title} <span dir="ltr">({sent.reference})</span>
      </p>
      <p className="m-0 text-[14px]">{text}</p>
      <span className="th-caps text-[11px] font-medium uppercase tracking-[0.16em] text-gold-ink">{t("yourMessage")}</span>
      <pre className="m-0 max-h-[170px] overflow-auto whitespace-pre-wrap rounded-xl border border-[#BFDCCB] bg-white/70 p-3 font-[inherit] text-[13px]" dir="auto">
        {sent.message}
      </pre>
      <div className="flex flex-wrap gap-2">
        {sent.whatsappUrl && (
          <a href={sent.whatsappUrl} target="_blank" rel="noopener noreferrer" className="th-btn th-btn-pink no-underline">
            {t("sendWhatsapp")}
          </a>
        )}
        <button type="button" className="th-btn" onClick={copy}>
          {copied ? t("copied") : t("copy")}
        </button>
      </div>
    </div>
  );
}
