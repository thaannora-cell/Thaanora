"use client";

import { useEffect, useId, useRef } from "react";
import { useTranslations } from "next-intl";

type Props = {
  open: boolean;
  onClose: () => void;
  eyebrow?: string;
  title: string;
  wide?: boolean;
  children: React.ReactNode;
};

// Native <dialog>: focus is trapped while open, Esc closes it, focus returns to the opener.
export default function Modal({ open, onClose, eyebrow, title, wide = false, children }: Props) {
  const t = useTranslations("Panel");
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className={`th-modal m-auto max-h-[calc(100dvh-24px)] w-[calc(100%-24px)] ${wide ? "max-w-[900px]" : "max-w-[600px]"} rounded-[22px] bg-ivory-white p-0 text-ink shadow-[0_24px_60px_rgba(0,0,0,0.35)]`}
    >
      <div className="relative flex flex-col gap-3.5 p-5 md:p-[26px]">
        <button
          type="button"
          onClick={onClose}
          aria-label={t("close")}
          className="absolute top-3.5 end-3.5 flex h-[42px] w-[42px] items-center justify-center rounded-full border border-line bg-ivory-white text-[20px] text-emerald"
        >
          ×
        </button>
        {eyebrow && (
          <span className="th-caps text-[11px] font-medium uppercase tracking-[0.16em] text-gold-ink">{eyebrow}</span>
        )}
        <h3
          id={titleId}
          className="th-dialog-title m-0 pe-12 font-[family-name:var(--font-cormorant)] text-[30px] font-semibold leading-[1.05] text-emerald"
        >
          {title}
        </h3>
        {children}
      </div>
    </dialog>
  );
}
