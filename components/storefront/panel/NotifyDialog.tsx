"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import Modal from "@/components/ui/Modal";
import RequestSent, { type SentRequest } from "../RequestSent";
import { savedContact } from "../savedContact";
import type { PublicProduct } from "@/lib/product";

type Props = {
  product: PublicProduct;
  open: boolean;
  onClose: () => void;
};

export default function NotifyDialog({ product, open, onClose }: Props) {
  const t = useTranslations("Panel");
  const tReq = useTranslations("Requests");
  const locale = useLocale();
  const [mode, setMode] = useState<"notify_me" | "preorder">("notify_me");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<"phone" | "too_many" | "other" | null>(null);
  const [sent, setSent] = useState<SentRequest | null>(null);

  useEffect(() => {
    if (!open) return;
    const c = savedContact();
    setName((v) => v || c.name);
    setPhone((v) => v || c.phone);
  }, [open]);

  // A new product starts a new request.
  useEffect(() => {
    setSent(null);
    setError(null);
  }, [product.code]);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const website = new FormData(e.currentTarget).get("website");
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: mode, productCode: product.code, name, phone, locale, website }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string } & Partial<SentRequest>;
      if (!res.ok || !data.ok || !data.reference || !data.message) {
        setError(data.error === "phone" ? "phone" : data.error === "too_many" ? "too_many" : "other");
        return;
      }
      setSent({ reference: data.reference, message: data.message, whatsappUrl: data.whatsappUrl ?? null });
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
      {sent ? (
        <RequestSent
          sent={sent}
          title={mode === "preorder" ? tReq("preorderSaved") : tReq("notifySaved")}
          text={sent.whatsappUrl ? tReq("sentText") : tReq("sentTextCopy")}
        />
      ) : (
        <>
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
              {tReq("nameOptional")}
              <input className="th-field" dir="auto" autoComplete="name" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
            </label>
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
                {error === "phone" ? t("phoneError") : error === "too_many" ? tReq("tooMany") : t("sendError")}
              </p>
            )}
            <button type="submit" disabled={busy} className="th-btn th-btn-pink disabled:opacity-60">
              {busy ? t("sending") : t("confirm")}
            </button>
          </form>
        </>
      )}
    </Modal>
  );
}
