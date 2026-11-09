"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import Modal from "@/components/ui/Modal";
import type { PublicProduct } from "@/lib/product";

type Props = {
  product: PublicProduct;
  open: boolean;
  onClose: () => void;
  onDone: (message: string) => void;
};

export default function NotifyDialog({ product, open, onClose, onDone }: Props) {
  const t = useTranslations("Panel");
  const locale = useLocale();
  const [mode, setMode] = useState<"notify_me" | "preorder">("notify_me");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<"phone" | "other" | null>(null);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const website = new FormData(e.currentTarget).get("website");
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: mode, productCode: product.code, phone, locale, website }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error === "phone" ? "phone" : "other");
        return;
      }
      setPhone("");
      onClose();
      onDone(mode === "preorder" ? t("preorderDone") : t("notifyDone"));
    } catch {
      setError("other");
    } finally {
      setBusy(false);
    }
  };

  const options = [
    { value: "notify_me" as const, title: t("notifyOption"), note: t("notifyOptionNote") },
    { value: "preorder" as const, title: t("preorderOption"), note: t("preorderOptionNote") },
  ];

  return (
    <Modal open={open} onClose={onClose} eyebrow={t("soldOutEyebrow")} title={product.name}>
      <p className="m-0 text-[14px] text-muted">{t("soldOutText")}</p>
      <form onSubmit={submit} className="flex flex-col gap-3">
        {options.map((o) => (
          <label key={o.value} className="th-opt">
            <input type="radio" name="mode" value={o.value} checked={mode === o.value} onChange={() => setMode(o.value)} />
            <span>
              {o.title}
              <small className="block text-[12px] text-muted">{o.note}</small>
            </span>
          </label>
        ))}
        <label className="flex flex-col gap-1.5 text-[13px] text-muted">
          {t("yourWhatsapp")}
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            dir="ltr"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="05X XXX XXXX"
            aria-invalid={error === "phone" || undefined}
            aria-describedby={error ? "notify-error" : undefined}
            className="th-field text-start"
          />
        </label>
        <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
        {error && (
          <p id="notify-error" role="alert" className="m-0 text-[13px] text-rani">
            {error === "phone" ? t("phoneError") : t("sendError")}
          </p>
        )}
        <button type="submit" disabled={busy} className="th-btn th-btn-pink disabled:opacity-60">
          {busy ? t("sending") : t("confirm")}
        </button>
      </form>
    </Modal>
  );
}
