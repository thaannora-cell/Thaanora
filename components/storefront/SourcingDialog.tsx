"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import Modal from "@/components/ui/Modal";
import RequestSent, { type SentRequest } from "./RequestSent";
import { savedContact } from "./savedContact";
import { track } from "@/lib/analytics";

export const OPEN_SOURCING_EVENT = "th:open-sourcing";
export const openSourcing = () => window.dispatchEvent(new Event(OPEN_SOURCING_EVENT));

// Brands customers often ask for, plus the ones on the rack.
const BRANDS = [
  "Alkaram Studio", "Beechtree", "Gul Ahmed", "Limelight", "Sapphire",
  "Agha Noor", "Cross Stitch", "Khaadi", "Maria B", "Sana Safinaz", "Zara Shahjahan",
];
const MAX_UPLOAD = 4 * 1024 * 1024;
const MAX_SIDE = 1600;

// Shrink big photos before upload; formats the browser can't draw (e.g. HEIC) are sent as they are.
async function shrink(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.85));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

type ErrorKind = "phone" | "need_design" | "too_big" | "not_image" | "too_many" | "other";

export default function SourcingDialog() {
  const t = useTranslations("Sourcing");
  const tReq = useTranslations("Requests");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [brand, setBrand] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ErrorKind | null>(null);
  const [sent, setSent] = useState<SentRequest | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onOpen = () => {
      const c = savedContact();
      setName((v) => v || c.name);
      setPhone((v) => v || c.phone);
      setOpen(true);
    };
    window.addEventListener(OPEN_SOURCING_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_SOURCING_EVENT, onOpen);
  }, []);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const pick = (f: File | null) => {
    setError(null);
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  };

  const close = () => {
    setOpen(false);
    if (sent) {
      // Start fresh next time; keep name and phone.
      setSent(null);
      setBrand("");
      setQuantity(1);
      setReference("");
      setNotes("");
      pick(null);
    }
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!reference.trim() && !file) return setError("need_design");
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("type", "sourcing");
      form.set("locale", locale);
      form.set("brand", brand);
      form.set("quantity", String(quantity));
      form.set("reference", reference);
      form.set("notes", notes);
      form.set("name", name);
      form.set("phone", phone);
      form.set("website", String(new FormData(e.currentTarget).get("website") ?? ""));
      if (file) {
        const blob = await shrink(file);
        if (blob.size > MAX_UPLOAD) {
          setError("too_big");
          return;
        }
        form.set("screenshot", blob, blob === file ? file.name : "screenshot.webp");
      }
      const res = await fetch("/api/requests", { method: "POST", body: form });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string } & Partial<SentRequest>;
      if (!res.ok || !data.ok || !data.reference || !data.message) {
        const known: ErrorKind[] = ["phone", "need_design", "too_big", "not_image", "too_many"];
        setError(known.includes(data.error as ErrorKind) ? (data.error as ErrorKind) : "other");
        return;
      }
      setSent({ reference: data.reference, message: data.message, whatsappUrl: data.whatsappUrl ?? null });
      track({ name: "sourcing_request" });
    } catch {
      setError("other");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={close} eyebrow={t("eyebrow")} title={t("title")}>
      {sent ? (
        <RequestSent sent={sent} title={tReq("sourcingSaved")} text={sent.whatsappUrl ? tReq("sentText") : tReq("sentTextCopy")} />
      ) : (
        <>
          <p className="m-0 text-[14px] text-muted">{t("intro")}</p>
          <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
            <div className="grid grid-cols-[1fr_96px] gap-2.5">
              <label className="flex flex-col gap-1.5 text-[13px] text-muted">
                {t("brand")}
                <select className="th-field" value={brand} onChange={(e) => setBrand(e.target.value)}>
                  <option value="">{t("notSure")}</option>
                  {BRANDS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                  <option value="Other">{t("other")}</option>
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-[13px] text-muted">
                {t("howMany")}
                <input
                  className="th-field"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={50}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.min(50, Math.max(1, Number(e.target.value) || 1)))}
                />
              </label>
            </div>

            <label className="flex flex-col gap-1.5 text-[13px] text-muted">
              {t("linkOrCode")}
              <input
                className="th-field text-start"
                dir="ltr"
                maxLength={300}
                placeholder={t("linkPlaceholder")}
                value={reference}
                onChange={(e) => {
                  setReference(e.target.value);
                  if (error === "need_design") setError(null);
                }}
              />
            </label>

            <div className="flex flex-col gap-1.5 text-[13px] text-muted">
              <span id="shot-label">{t("screenshot")}</span>
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                aria-labelledby="shot-label"
                className="sr-only"
                onChange={(e) => pick(e.target.files?.[0] ?? null)}
              />
              {preview ? (
                <div className="flex items-end gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element -- local preview of the visitor's own file */}
                  <img src={preview} alt={t("screenshotAlt")} className="max-h-[140px] w-auto rounded-[10px] border border-line" />
                  <button type="button" className="text-[13px] text-emerald underline underline-offset-2" onClick={() => { pick(null); if (fileInput.current) fileInput.current.value = ""; }}>
                    {t("removeScreenshot")}
                  </button>
                </div>
              ) : (
                <button type="button" className="th-btn self-start" onClick={() => fileInput.current?.click()}>
                  {t("addScreenshot")}
                </button>
              )}
            </div>

            <label className="flex flex-col gap-1.5 text-[13px] text-muted">
              {t("notes")}
              <textarea
                className="th-field min-h-[76px] resize-y"
                dir="auto"
                maxLength={500}
                placeholder={t("notesPlaceholder")}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-[13px] text-muted">
                {tReq("nameOptional")}
                <input className="th-field" dir="auto" autoComplete="name" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
              </label>
              <label className="flex flex-col gap-1.5 text-[13px] text-muted">
                {t("phone")}
                <input
                  className="th-field text-start"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  dir="ltr"
                  required
                  placeholder="05X XXX XXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  aria-invalid={error === "phone" || undefined}
                />
              </label>
            </div>
            <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />

            {error && (
              <p role="alert" className="m-0 text-[13px] text-rani">
                {t(`error_${error}`)}
              </p>
            )}
            <button type="submit" disabled={busy} className="th-btn th-btn-pink disabled:opacity-60">
              {busy ? t("sending") : t("submit")}
            </button>
            <p className="m-0 text-[12px] text-muted">{t("privacy")}</p>
          </form>
        </>
      )}
    </Modal>
  );
}
