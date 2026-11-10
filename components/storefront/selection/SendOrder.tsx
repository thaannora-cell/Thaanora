"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSelection } from "./SelectionProvider";

type ErrorKind = "name" | "phone" | "area" | "stock" | "too_many" | "other";

// Saves the order through /api/orders, then opens WhatsApp with the message ready to send.
export default function SendOrder() {
  const sel = useSelection();
  const t = useTranslations("Order");
  const tSel = useTranslations("Selection");
  const locale = useLocale();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ErrorKind | null>(null);
  const [copied, setCopied] = useState(false);

  if (!sel) return null;
  const { checkout, updateCheckout } = sel;
  const placed = sel.placedOrder;

  const copy = async (message: string) => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  if (placed) {
    return (
      <div className="flex flex-col gap-3 rounded-[18px] border border-[#BFDCCB] bg-[#E7F3EC] p-4 text-[#1d3a2d]" role="status">
        <p className="m-0 text-[15px] font-medium">{t("placedTitle", { orderNo: placed.orderNo })}</p>
        <p className="m-0 text-[14px]">{placed.whatsappUrl ? t("placedText") : t("placedNoWhatsapp")}</p>
        <pre className="m-0 max-h-[190px] overflow-auto whitespace-pre-wrap rounded-xl border border-[#BFDCCB] bg-white/70 p-3 font-[inherit] text-[13px]" dir="auto">
          {placed.message}
        </pre>
        <div className="flex flex-wrap gap-2">
          {placed.whatsappUrl && (
            <a href={placed.whatsappUrl} target="_blank" rel="noopener noreferrer" className="th-btn th-btn-pink no-underline">
              {t("openWhatsapp")}
            </a>
          )}
          <button type="button" className="th-btn" onClick={() => copy(placed.message)}>
            {copied ? t("copied") : t("copy")}
          </button>
        </div>
        <button type="button" className="self-start text-[13px] text-emerald underline underline-offset-2" onClick={sel.closeDrawer}>
          {t("keepShopping")}
        </button>
      </div>
    );
  }

  if (sel.lines.length === 0) return null;

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    if (!checkout.area) return setError("area");
    if (checkout.customerName.trim().length < 2) return setError("name");
    setBusy(true);
    setError(null);
    // Opened during the tap so pop-up blockers allow it; pointed at WhatsApp once the order is saved.
    const tab = window.open("", "_blank");
    const website = new FormData(e.currentTarget).get("website");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale,
          website,
          lines: sel.lines,
          discountCode: sel.appliedCode?.code ?? null,
          checkout,
          customer: { name: checkout.customerName, phone: checkout.customerPhone },
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        orderNo?: string;
        message?: string;
        whatsappUrl?: string | null;
      };
      if (!res.ok || !data.ok || !data.orderNo || !data.message) {
        tab?.close();
        const known: ErrorKind[] = ["name", "phone", "area", "stock", "too_many"];
        setError(known.includes(data.error as ErrorKind) ? (data.error as ErrorKind) : "other");
        return;
      }
      const result = { orderNo: data.orderNo, message: data.message, whatsappUrl: data.whatsappUrl ?? null };
      if (result.whatsappUrl && tab) tab.location.href = result.whatsappUrl;
      else tab?.close();
      sel.orderPlaced(result);
    } catch {
      tab?.close();
      setError("other");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
      <span className="th-caps text-[11px] font-medium uppercase tracking-[0.16em] text-gold-ink">{t("yourDetails")}</span>
      <label className="flex flex-col gap-1.5 text-[13px] text-muted">
        {t("name")}
        <input
          className="th-field"
          dir="auto"
          autoComplete="name"
          required
          maxLength={80}
          value={checkout.customerName}
          onChange={(e) => updateCheckout({ customerName: e.target.value })}
          aria-invalid={error === "name" || undefined}
        />
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
          value={checkout.customerPhone}
          onChange={(e) => updateCheckout({ customerPhone: e.target.value })}
          aria-invalid={error === "phone" || undefined}
        />
      </label>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />

      {error && (
        <p role="alert" className="m-0 text-[13px] text-rani">
          {t(`error_${error}`)}
        </p>
      )}

      <button type="submit" disabled={busy || sel.lines.length === 0} className="th-btn th-btn-pink w-full disabled:opacity-60">
        {busy ? t("sending") : tSel("orderButton")}
      </button>
      <p className="m-0 text-[12px] text-muted">{t("privacy")}</p>
    </form>
  );
}
