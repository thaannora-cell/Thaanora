"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import Modal from "@/components/ui/Modal";
import { photoUrl, salePrice, stockState, type PublicProduct } from "@/lib/product";
import { fabricBackground } from "../rack/fabricPattern";
import ModelFigure, { SAMPLE_FACE, type Face } from "../tryon/ModelFigure";
import { useSelection } from "../selection/SelectionProvider";
import { track } from "@/lib/analytics";

export const OPEN_TRYON_EVENT = "th:open-tryon";
export const openTryOn = () => window.dispatchEvent(new Event(OPEN_TRYON_EVENT));

type Props = {
  products: PublicProduct[];
  startCode: string | null;
  open: boolean;
  onClose: () => void;
  face: Face | null;
  onFace: (face: Face | null) => void;
  onAdd: (code: string) => void;
  onNotify: (code: string) => void;
};

// Simple preview: her face photo is placed on our drawn model in the chosen fabric.
// The photo is read in the browser only; it is never uploaded or stored.
export default function TryOnDialog({ products, startCode, open, onClose, face, onFace, onAdd, onNotify }: Props) {
  const t = useTranslations("TryOn");
  const tHome = useTranslations("Home");
  const tRack = useTranslations("Rack");
  const tPanel = useTranslations("Panel");
  const sel = useSelection();
  const [code, setCode] = useState<string | null>(startCode);
  const [photoError, setPhotoError] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setCode(startCode);
  }, [open, startCode]);
  useEffect(() => {
    if (open && startCode) track({ name: "try_on", code: startCode });
  }, [open, startCode]);

  const p = products.find((x) => x.code === code) ?? products[0];
  if (!p) return null;
  const out = stockState(p.stock) === "out";
  const chosen = sel?.has(p.code) ?? false;
  const photo = p.product_images[0];

  const pickPhoto = (file: File | undefined) => {
    if (!file) return;
    const src = URL.createObjectURL(file);
    // Check the browser can show it (e.g. HEIC often can't) before using it.
    const img = new window.Image();
    img.onload = () => {
      setPhotoError(false);
      if (face?.src.startsWith("blob:")) URL.revokeObjectURL(face.src);
      onFace({ src, z: 1.25, x: 0, y: 0.08 });
    };
    img.onerror = () => {
      URL.revokeObjectURL(src);
      setPhotoError(true);
    };
    img.src = src;
  };

  const removePhoto = () => {
    if (face?.src.startsWith("blob:")) URL.revokeObjectURL(face.src);
    onFace(null);
    if (fileInput.current) fileInput.current.value = "";
  };

  const slider = (key: "z" | "y" | "x", min: number, max: number, step: number) => (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={face?.[key] ?? 0}
      onChange={(e) => face && onFace({ ...face, [key]: Number(e.target.value) })}
      className="w-full accent-[var(--color-emerald)]"
    />
  );

  return (
    <Modal open={open} onClose={onClose} wide eyebrow={t("eyebrow")} title={t("title")}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Stage */}
        <div
          className="relative flex h-[390px] items-end justify-center overflow-hidden rounded-[18px] px-4 pt-6 md:h-[540px]"
          style={fabricBackground(p.colour_hex, p.accent_hex, p.work === "Printed")}
        >
          <span className="absolute start-3.5 top-3.5 z-[3] rounded-full bg-ivory-white px-3 py-1 text-[12px] font-medium text-emerald">
            {face ? <b className="font-semibold text-rani">{t("you")}</b> : t("previewOf")} · <bdi>{p.name}</bdi>
          </span>
          <span className="absolute bottom-3 start-3.5 z-[3] rounded-full bg-emerald px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-gold-light">
            {t("previewBadge")}
          </span>
          {photo && (
            <span className="absolute end-3 top-3 z-[2] block h-[122px] w-[92px] overflow-hidden rounded-t-[46px] rounded-b-[10px] border-2 border-gold shadow-[0_8px_16px_rgba(0,0,0,0.25)]">
              <Image src={photoUrl(photo.storage_path)} alt={t("realSuit")} fill sizes="92px" className="object-cover object-[center_18%]" />
            </span>
          )}
          <div className="th-mirror relative flex h-[360px] items-end justify-center px-[14%] md:h-[520px]">
            <ModelFigure
              colour={p.colour_hex}
              accent={p.accent_hex}
              printed={p.work === "Printed"}
              face={face}
              label={t("figureLabel", { name: p.name })}
              className="relative h-[340px] w-auto drop-shadow-[0_14px_18px_rgba(0,0,0,0.3)] md:h-[500px]"
            />
          </div>
        </div>

        {/* Controls */}
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-2">
            <span className="th-caps text-[11px] font-medium uppercase tracking-[0.16em] text-gold-ink">{t("step1")}</span>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              className="sr-only"
              aria-label={t("upload")}
              onChange={(e) => pickPhoto(e.target.files?.[0])}
            />
            <div className="flex flex-wrap gap-2">
              <button type="button" className="th-btn" onClick={() => fileInput.current?.click()}>
                {face && face.src !== SAMPLE_FACE.src ? t("changePhoto") : t("upload")}
              </button>
              <button type="button" className="th-btn" onClick={() => onFace({ ...SAMPLE_FACE })}>
                {t("sample")}
              </button>
              {face && (
                <button type="button" className="text-[13px] text-emerald underline underline-offset-2" onClick={removePhoto}>
                  {t("removePhoto")}
                </button>
              )}
            </div>
            {photoError && (
              <p role="alert" className="m-0 text-[13px] text-rani">
                {t("photoError")}
              </p>
            )}
            {face && (
              <div className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1.5 text-[13px] text-muted">
                <span>{t("size")}</span>
                {slider("z", 0.8, 3, 0.05)}
                <span>{t("upDown")}</span>
                {slider("y", -0.45, 0.45, 0.01)}
                <span>{t("leftRight")}</span>
                {slider("x", -0.45, 0.45, 0.01)}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <span className="th-caps text-[11px] font-medium uppercase tracking-[0.16em] text-gold-ink">{t("step2")}</span>
            <div role="group" aria-label={t("step2")} className="flex flex-wrap gap-1.5">
              {products.map((x) => (
                <button
                  key={x.code}
                  type="button"
                  aria-pressed={x.code === p.code}
                  aria-label={x.name}
                  title={x.name}
                  onClick={() => setCode(x.code)}
                  className="th-swatch relative h-11 w-[34px] overflow-hidden rounded-t-[17px] rounded-b"
                  style={{ background: x.colour_hex }}
                >
                  {x.product_images[0] && (
                    <Image src={photoUrl(x.product_images[0].storage_path)} alt="" fill sizes="34px" className="object-cover object-[center_22%]" />
                  )}
                </button>
              ))}
            </div>
            <p className="m-0 text-[14px] text-emerald">
              <b className="font-medium">
                <bdi>{p.brand}</bdi>
              </b>{" "}
              · <bdi>{p.name}</bdi> · {tRack("price", { amount: salePrice(p) })}
              {out && ` · ${tRack("tagSoldOut")}`}
            </p>
          </div>

          <button
            type="button"
            className={`th-btn th-btn-pink ${chosen && !out ? "!bg-emerald !border-emerald" : ""}`}
            onClick={() => (out ? onNotify(p.code) : !chosen && onAdd(p.code))}
          >
            {out ? tPanel("notifyBtn") : chosen ? tHome("added") : tHome("add")}
          </button>

          <p className="m-0 rounded-xl border border-gold/50 bg-gold/10 px-3 py-2.5 text-[12px] text-walnut">{t("note")}</p>
        </div>
      </div>
    </Modal>
  );
}
