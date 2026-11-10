"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import Modal from "@/components/ui/Modal";

export const OPEN_TRACK_EVENT = "th:open-track";
export const openTrackOrder = () => window.dispatchEvent(new Event(OPEN_TRACK_EVENT));

type Tracked = {
  orderNo: string;
  status: string;
  placedAt: string;
  updatedAt: string;
  total: number;
  suits: number;
  courier: string | null;
  trackingNo: string | null;
};

const STEPS = ["waiting_confirmation", "confirmed", "packed", "with_courier", "delivered_cash_collected"] as const;
const STOPPED = ["cancelled", "refused_at_door"];

function savedPhone(): string {
  try {
    const c = JSON.parse(window.localStorage.getItem("th_checkout") ?? "{}") as { customerPhone?: unknown };
    return typeof c.customerPhone === "string" ? c.customerPhone : "";
  } catch {
    return "";
  }
}

// One dialog for the whole site; the header pill, the footer link and ?track=TH-1024 links
// (sent in the "out for delivery" WhatsApp message) open it. whatsapp: the shop's number from Settings.
export default function TrackOrderDialog({ whatsapp = null }: { whatsapp?: string | null }) {
  const t = useTranslations("Track");
  const tRack = useTranslations("Rack");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [orderNo, setOrderNo] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<"invalid" | "not_found" | "too_many" | "other" | null>(null);
  const [result, setResult] = useState<Tracked | null>(null);

  useEffect(() => {
    const onOpen = () => {
      setOpen(true);
      setPhone((p) => p || savedPhone());
    };
    window.addEventListener(OPEN_TRACK_EVENT, onOpen);

    // A tracking link from WhatsApp: open with the order number filled in, then tidy the address.
    const url = new URL(window.location.href);
    const fromLink = url.searchParams.get("track")?.trim().toUpperCase() ?? "";
    if (/^TH-\d{3,7}$/.test(fromLink)) {
      setOrderNo(fromLink);
      onOpen();
      url.searchParams.delete("track");
      window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    }
    return () => window.removeEventListener(OPEN_TRACK_EVENT, onOpen);
  }, []);

  const date = (iso: string) =>
    new Intl.DateTimeFormat(`${locale}-u-ca-gregory`, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(iso));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNo, phone }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; order?: Tracked };
      if (data.ok && data.order) setResult(data.order);
      else setError(data.error === "too_many" ? "too_many" : data.error === "invalid" ? "invalid" : data.error === "not_found" ? "not_found" : "other");
    } catch {
      setError("other");
    } finally {
      setBusy(false);
    }
  };

  const stopped = result && STOPPED.includes(result.status);
  const current = result ? STEPS.indexOf(result.status as (typeof STEPS)[number]) : -1;
  const delivered = result?.status === "delivered_cash_collected";
  const askNo = result?.orderNo ?? (/^TH-\d{3,7}$/i.test(orderNo.trim()) ? orderNo.trim().toUpperCase() : "");
  const askUrl = whatsapp && askNo ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(t("askMessage", { orderNo: askNo }))}` : null;

  return (
    <Modal open={open} onClose={() => setOpen(false)} eyebrow={t("eyebrow")} title={t("title")}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-[13px] text-muted">
            {t("orderNo")}
            <input
              className="th-field text-start uppercase"
              dir="ltr"
              required
              autoComplete="off"
              placeholder="TH-1024"
              value={orderNo}
              onChange={(e) => setOrderNo(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-[13px] text-muted">
            {t("phone")}
            <input
              className="th-field text-start"
              dir="ltr"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              required
              placeholder="05X XXX XXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </label>
        </div>
        <button type="submit" disabled={busy} className="th-btn th-btn-pink disabled:opacity-60">
          {busy ? t("checking") : t("submit")}
        </button>
      </form>

      {error && (
        <p role="alert" className="m-0 text-[14px] text-rani">
          {t(`error_${error}`)}
        </p>
      )}

      {result && (
        <div aria-live="polite" className="flex flex-col gap-3">
          <p className="m-0 text-[14px] text-muted">
            <b dir="ltr" className="font-medium text-emerald">
              {result.orderNo}
            </b>{" "}
            · {t("summary", { suits: result.suits, total: tRack("price", { amount: result.total }) })}
          </p>

          {stopped ? (
            <p className="m-0 rounded-xl border border-[#F0C3D3] bg-[#FBEFF3] px-3 py-2.5 text-[14px] text-[#7A1238]">
              {t(result.status === "cancelled" ? "cancelled" : "refused", { date: date(result.updatedAt) })}
            </p>
          ) : (
            <ol className="th-track m-0 list-none p-0">
              {STEPS.map((s, i) => {
                const state = delivered || i < current ? "done" : i === current ? "now" : "todo";
                return (
                  <li key={s} className={`th-track-${state}`} aria-current={state === "now" ? "step" : undefined}>
                    <b className="block font-medium text-emerald">{t(`step_${s}`)}</b>
                    <span>
                      {s === "with_courier" && (result.courier || result.trackingNo)
                        ? t("courierLine", { courier: result.courier ?? "—", tracking: result.trackingNo ?? "—" })
                        : t(`step_${s}_text`)}
                    </span>
                    {i === 0 && <small className="block text-[12px]">{date(result.placedAt)}</small>}
                    {i === current && i > 0 && <small className="block text-[12px]">{date(result.updatedAt)}</small>}
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      )}

      {askUrl && (
        <a href={askUrl} target="_blank" rel="noopener noreferrer" className="th-btn self-start no-underline">
          {t("ask")}
        </a>
      )}

      <p className="m-0 text-[12px] text-muted">{t("note")}</p>
    </Modal>
  );
}
