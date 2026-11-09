"use client";

import { useTranslations } from "next-intl";

type Props = { whatsapp: string | null; aboveTray?: boolean };

// Floating "Chat with us" button. Opens a WhatsApp chat with the shop's number from settings.
export default function WhatsAppHelp({ whatsapp, aboveTray = false }: Props) {
  const t = useTranslations("Help");
  if (!whatsapp) return null;
  const href = `https://wa.me/${whatsapp}?text=${encodeURIComponent(t("message"))}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t("label")}
      title={t("label")}
      className={`th-help ${aboveTray ? "th-help-tray" : ""}`}
    >
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 11.5 A8 8 0 0 1 8.2 18.6 L4 20 L5.4 16 A8 8 0 1 1 20 11.5Z" />
        <path d="M9 9.5 C9 12 11.5 14.5 14 14.5" />
      </svg>
    </a>
  );
}
