"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import Modal from "@/components/ui/Modal";
import { salePrice, type PublicProduct } from "@/lib/product";

type Props = { product: PublicProduct | null; open: boolean; onClose: () => void };

// Share a suit: WhatsApp, Facebook, Instagram (phone share sheet, else copy the link to paste in a story
// or message), or copy the link. Shares the suit's own page, so the preview shows the suit's photo.
export default function ShareSheet({ product: p, open, onClose }: Props) {
  const t = useTranslations("Share");
  const tPanel = useTranslations("Panel");
  const tRack = useTranslations("Rack");
  const locale = useLocale();
  const [note, setNote] = useState<string | null>(null);
  if (!p) return null;

  const url = `${window.location.origin}/${locale}/suits/${encodeURIComponent(p.code)}`;
  const text = tPanel("shareText", { name: `${p.brand} ${p.name}`, price: tRack("price", { amount: salePrice(p) }) });
  const copy = async (message: string) => {
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setNote(message);
    } catch {
      setNote(url);
    }
  };
  const instagram = async () => {
    // Phones: the system share sheet lists Instagram (story, DM). Computers: copy, then paste in Instagram.
    if (navigator.share) {
      try {
        await navigator.share({ title: "Thaanora", text, url });
        return;
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
      }
    }
    await copy(t("instagramCopied"));
  };

  const item = "flex min-h-[48px] w-full items-center gap-3 rounded-2xl border border-line bg-white px-4 text-start text-[15px] text-ink no-underline transition-colors hover:border-gold";
  return (
    <Modal
      open={open}
      onClose={() => {
        setNote(null);
        onClose();
      }}
      eyebrow={t("eyebrow")}
      title={p.name}
    >
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        <li>
          <a href={`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`} target="_blank" rel="noopener noreferrer" className={item}>
            <WhatsAppIcon />
            {t("whatsapp")}
          </a>
        </li>
        <li>
          <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer" className={item}>
            <FacebookIcon />
            {t("facebook")}
          </a>
        </li>
        <li>
          <button type="button" onClick={() => void instagram()} className={item}>
            <InstagramIcon />
            {t("instagram")}
          </button>
        </li>
        <li>
          <button type="button" onClick={() => void copy(tPanel("linkCopied"))} className={item}>
            <LinkIcon />
            {t("copy")}
          </button>
        </li>
      </ul>
      <p role="status" aria-live="polite" className="m-0 min-h-[20px] text-[13px] text-emerald">
        {note}
      </p>
    </Modal>
  );
}

const box = "flex h-9 w-9 shrink-0 items-center justify-center rounded-full";
function WhatsAppIcon() {
  return (
    <span className={`${box} bg-[#25D366]`} aria-hidden="true">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff">
        <path d="M12 3.2a8.7 8.7 0 0 0-7.5 13.1L3.3 20.8l4.6-1.2A8.7 8.7 0 1 0 12 3.2Zm0 15.9c-1.3 0-2.6-.4-3.7-1l-.3-.2-2.7.7.7-2.6-.2-.3A7.2 7.2 0 1 1 12 19.1Zm4-5.4c-.2-.1-1.3-.7-1.5-.7-.2-.1-.4-.1-.5.1l-.7.9c-.1.1-.3.2-.5.1a5.9 5.9 0 0 1-2.9-2.6c-.2-.4.2-.4.6-1.2.1-.1 0-.3 0-.4l-.7-1.6c-.2-.4-.4-.4-.5-.4h-.4a.8.8 0 0 0-.6.3 2.5 2.5 0 0 0-.8 1.9c0 1.1.8 2.2.9 2.4.1.1 1.6 2.5 4 3.5 1.5.6 2.1.7 2.8.6.5-.1 1.3-.5 1.5-1.1.2-.5.2-1 .1-1.1l-.6-.3Z" />
      </svg>
    </span>
  );
}
function FacebookIcon() {
  return (
    <span className={`${box} bg-[#1877F2]`} aria-hidden="true">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff">
        <path d="M13.5 21v-7.6h2.6l.4-3h-3V8.5c0-.9.3-1.5 1.5-1.5h1.6V4.3c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H7.8v3h2.6V21h3.1Z" />
      </svg>
    </span>
  );
}
function InstagramIcon() {
  return (
    <span className={`${box} bg-[linear-gradient(45deg,#F58529,#DD2A7B,#8134AF)]`} aria-hidden="true">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
        <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.3" cy="6.7" r="1" fill="#fff" stroke="none" />
      </svg>
    </span>
  );
}
function LinkIcon() {
  return (
    <span className={`${box} bg-ivory text-emerald`} aria-hidden="true">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-emerald)" strokeWidth="1.8" strokeLinecap="round">
        <path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1" />
        <path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1" />
      </svg>
    </span>
  );
}
