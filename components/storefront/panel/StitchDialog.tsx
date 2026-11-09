"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Modal from "@/components/ui/Modal";
import type { PublicProduct } from "@/lib/product";
import { useAreaLabel } from "../useAreaLabel";

export type Tailor = { id: string; name: string; area: string; member_price_note: string | null };

const FIELDS = ["bust", "waist", "hips", "shoulder", "shirt", "sleeve", "trouser", "hem"] as const;
const NECKLINES = ["round", "vNeck", "boat", "collar", "askTailor"] as const;
const KEY = "th_measurements";

type Measurements = Partial<Record<(typeof FIELDS)[number] | "neck", string>>;

function load(): Measurements {
  try {
    const v: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? "{}");
    return v && typeof v === "object" ? (v as Measurements) : {};
  } catch {
    return {};
  }
}

type Props = {
  product: PublicProduct;
  open: boolean;
  onClose: () => void;
  areas: string[];
  tailors: Tailor[];
  canAdd: boolean;
  onAddWithStitching: () => void;
  onToast: (message: string) => void;
};

export default function StitchDialog({ product, open, onClose, areas, tailors, canAdd, onAddWithStitching, onToast }: Props) {
  const t = useTranslations("Panel");
  const areaLabel = useAreaLabel();
  const [area, setArea] = useState(areas[0] ?? "");
  const [m, setM] = useState<Measurements>({});

  useEffect(() => {
    if (open) setM(load());
  }, [open]);

  const inArea = tailors.filter((x) => x.area === area);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      window.localStorage.setItem(KEY, JSON.stringify(m));
    } catch {
      // storage blocked: keep them for this visit only
    }
    onToast(t("measurementsSaved"));
  };

  const steps = [
    [t("step1Title"), t("step1Text")],
    [t("step2Title"), t("step2Text")],
    [t("step3Title"), t("step3Text")],
  ];

  return (
    <Modal open={open} onClose={onClose} eyebrow={t("stitchEyebrow")} title={t("stitchTitle")}>
      <ol className="m-0 grid list-none grid-cols-1 gap-2.5 p-0 sm:grid-cols-3">
        {steps.map(([title, text], i) => (
          <li key={title} className="rounded-[14px] border border-line bg-white p-3 text-[13px] text-muted">
            <i className="block font-[family-name:var(--font-cormorant)] text-[22px] not-italic text-gold-ink">{i + 1}</i>
            <b className="block text-[14px] font-medium text-emerald">{title}</b>
            {text}
          </li>
        ))}
      </ol>

      <label className="flex flex-col gap-1.5 text-[13px] text-muted">
        {t("yourArea")}
        <select value={area} onChange={(e) => setArea(e.target.value)} className="th-field">
          {areas.map((a) => (
            <option key={a} value={a}>
              {areaLabel(a)}
            </option>
          ))}
        </select>
      </label>

      <ul className="m-0 flex list-none flex-col gap-2 p-0" aria-live="polite">
        {inArea.length === 0 && <li className="text-[14px] text-muted">{t("noTailors")}</li>}
        {inArea.map((x) => (
          <li key={x.id} className="flex items-center justify-between gap-2.5 rounded-[14px] border border-line bg-white px-3.5 py-2.5 text-[14px]">
            <span>
              <bdi>{x.name}</bdi>
              <small className="block text-muted">{t("tailorLine")}</small>
            </span>
            <span className="shrink-0 rounded-full bg-emerald px-2.5 py-0.5 text-[11px] text-gold-light">{t("verified")}</span>
          </li>
        ))}
      </ul>

      <span className="th-caps mt-1 text-[11px] font-medium uppercase tracking-[0.16em] text-gold-ink">{t("measurementsTitle")}</span>
      <form onSubmit={save} className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {FIELDS.map((f) => (
            <label key={f} className="flex flex-col gap-1.5 text-[13px] text-muted">
              {t(`m_${f}`)}
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.5"
                value={m[f] ?? ""}
                onChange={(e) => setM((v) => ({ ...v, [f]: e.target.value }))}
                className="th-field"
              />
            </label>
          ))}
          <label className="flex flex-col gap-1.5 text-[13px] text-muted">
            {t("m_neck")}
            <select value={m.neck ?? "round"} onChange={(e) => setM((v) => ({ ...v, neck: e.target.value }))} className="th-field">
              {NECKLINES.map((n) => (
                <option key={n} value={n}>
                  {t(`neck_${n}`)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button type="submit" className="th-btn">
          {t("saveMeasurements")}
        </button>
      </form>

      {canAdd && (
        <button
          type="button"
          className="th-btn th-btn-pink"
          onClick={() => {
            onAddWithStitching();
            onClose();
          }}
        >
          {t("addWithStitching", { name: product.name })}
        </button>
      )}
    </Modal>
  );
}
