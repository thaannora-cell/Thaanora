"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Modal from "@/components/ui/Modal";
import { stockState, type PublicProduct } from "@/lib/product";
import { useAreaLabel } from "../useAreaLabel";
import { useSelection } from "../selection/SelectionProvider";

export type Tailor = { id: string; name: string; area: string; member_price_note: string | null };

export const OPEN_TAILORS_EVENT = "th:open-tailors";
export const openTailors = () => window.dispatchEvent(new Event(OPEN_TAILORS_EVENT));

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
  // With a suit: offers "Add … with stitching". Without: the tailor network screen,
  // where suits already in the bag can be ticked for stitching.
  product: PublicProduct | null;
  open: boolean;
  onClose: () => void;
  tailors: Tailor[];
  onToast: (message: string) => void;
};

export default function StitchDialog({ product, open, onClose, tailors, onToast }: Props) {
  const t = useTranslations("Panel");
  const areaLabel = useAreaLabel();
  const sel = useSelection();
  const areas = sel?.settings.areas.map((a) => a.area) ?? [];
  const pct = sel?.settings.tailorDiscountPct ?? 10;
  const [area, setArea] = useState("");
  const [m, setM] = useState<Measurements>({});

  useEffect(() => {
    if (!open) return;
    setM(load());
    // Start on her delivery area if she chose one at checkout.
    setArea((a) => a || sel?.checkout.area || areas[0] || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the dialog opens
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
    [t("step3Title"), t("step3Text", { pct })],
  ];

  const canAdd = product !== null && stockState(product.stock) !== "out";

  return (
    <Modal open={open} onClose={onClose} eyebrow={t("stitchEyebrow")} title={t("stitchTitle")}>
      <ol className="m-0 grid list-none grid-cols-1 gap-2.5 p-0 sm:grid-cols-3">
        {steps.map(([title, text], i) => (
          <li key={title} className="flex gap-3 rounded-[14px] border border-line bg-white p-3 text-[13px] text-muted sm:block">
            <i className="block shrink-0 font-[family-name:var(--font-cormorant)] text-[22px] not-italic leading-none text-gold-ink">{i + 1}</i>
            <span>
              <b className="block text-[14px] font-medium text-emerald">{title}</b>
              {text}
            </span>
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
              <small className="block text-muted">{t("tailorLine", { pct })}</small>
            </span>
            <span className="shrink-0 rounded-full bg-emerald px-2.5 py-0.5 text-[11px] text-gold-light">{t("verified")}</span>
          </li>
        ))}
      </ul>

      {product === null && sel && (
        <section className="flex flex-col gap-2" aria-labelledby="stitch-bag">
          <span id="stitch-bag" className="th-caps mt-1 text-[11px] font-medium uppercase tracking-[0.16em] text-gold-ink">
            {t("bagTitle")}
          </span>
          {sel.lines.length === 0 ? (
            <p className="m-0 text-[14px] text-muted">{t("bagEmpty")}</p>
          ) : (
            sel.lines.map((l) => {
              const p = sel.products.get(l.code);
              if (!p) return null;
              return (
                <label key={l.code} className="th-opt">
                  <input type="checkbox" checked={l.stitch} onChange={(e) => sel.setStitch(l.code, e.target.checked)} />
                  <span>
                    <bdi>{p.name}</bdi>
                    <small className="block text-[12px] text-muted">
                      <bdi>{p.brand}</bdi> · {l.stitch ? t("willBeStitched") : t("tickToStitch")}
                    </small>
                  </span>
                </label>
              );
            })
          )}
        </section>
      )}

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
                max="80"
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

      {product && canAdd && sel && (
        <button
          type="button"
          className="th-btn th-btn-pink"
          onClick={() => {
            sel.add(product.code, { stitch: true });
            onToast(t("addedWithStitching"));
            onClose();
          }}
        >
          {sel.stitched(product.code) ? t("addedStitched") : t("addWithStitching", { name: product.name })}
        </button>
      )}
    </Modal>
  );
}
