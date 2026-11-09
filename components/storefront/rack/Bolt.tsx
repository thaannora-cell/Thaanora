"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { photoUrl, salePrice, stockState, type PublicProduct } from "@/lib/product";
import { fabricBackground, hemBackground } from "./fabricPattern";
import s from "./rack.module.css";

type Props = {
  product: PublicProduct;
  open: boolean;
  chosen: boolean;
  saved: boolean;
  brandOfMonth: boolean;
  priority: boolean;
  onOpen: () => void;
  onStep: (dir: 1 | -1) => void;
  onToggleSaved: () => void;
  onToggleChosen: () => void;
};

export default function Bolt({ product: p, open, chosen, saved, brandOfMonth, priority, onOpen, onStep, onToggleSaved, onToggleChosen }: Props) {
  const t = useTranslations("Rack");
  const tHome = useTranslations("Home");
  const [photoIndex, setPhotoIndex] = useState(0);

  const price = salePrice(p);
  const stock = stockState(p.stock);
  const photo = p.product_images[0];
  const printed = p.work === "Printed";
  const name = `${p.brand} · ${p.name}`;

  const closedTag =
    stock === "out" ? (
      <span className={`${s.tag} ${s.tagOut}`}>{t("tagSold")}</span>
    ) : p.sale_pct > 0 ? (
      <span className={`${s.tag} ${s.tagSale}`} dir="ltr">{t("tagSaleShort", { pct: p.sale_pct })}</span>
    ) : stock === "low" ? (
      <span className={`${s.tag} ${s.tagLow}`}>{t("tagLeft", { n: p.stock })}</span>
    ) : p.trending_rank ? (
      <span className={`${s.tag} ${s.tagTrend}`} dir="ltr">#{p.trending_rank}</span>
    ) : p.is_new ? (
      <span className={`${s.tag} ${s.tagNew}`}>{tHome("o_new")}</span>
    ) : null;

  const openTags = (
    <>
      {stock === "out" && <span className={`${s.tag} ${s.tagOut}`}>{t("tagSoldOut")}</span>}
      {p.sale_pct > 0 && <span className={`${s.tag} ${s.tagSale}`}>{t("tagSale", { pct: p.sale_pct })}</span>}
      {p.trending_rank && <span className={`${s.tag} ${s.tagTrend}`}>{t("tagTrending", { rank: p.trending_rank })}</span>}
      {p.is_new && <span className={`${s.tag} ${s.tagNew}`}>{tHome("o_new")}</span>}
      {brandOfMonth && <span className={s.tag}>{t("tagBrandOfMonth")}</span>}
    </>
  );

  const classes = [s.bolt, open && s.on, chosen && s.chosen, stock === "out" && s.out].filter(Boolean).join(" ");
  const fabricStyle = { "--fabric": p.colour_hex, ...(open ? fabricBackground(p.colour_hex, p.accent_hex, printed) : {}) } as React.CSSProperties;

  return (
    <div role="listitem" className={classes} style={fabricStyle} data-code={p.code}>
      {!open && photo && (
        <div className={s.photo} aria-hidden="true">
          <Image src={photoUrl(photo.storage_path)} alt="" fill sizes="(max-width: 760px) 100vw, 480px" />
        </div>
      )}
      {!open && !photo && <div className={s.photo} style={fabricBackground(p.colour_hex, p.accent_hex, printed)} aria-hidden="true" />}
      {!open && <div className={s.shade} aria-hidden="true" />}
      {open && !printed && <div className={s.hem} style={hemBackground(p.accent_hex)} aria-hidden="true" />}

      <div className={s.tags}>{open ? openTags : closedTag}</div>
      {chosen && <span className={s.selMark} aria-hidden="true">✓</span>}

      {!open && (
        <button
          type="button"
          className={s.pick}
          onClick={onOpen}
          aria-label={`${t("openLabel", { name, price })}${stock === "out" ? t("soldOutSuffix") : ""}${chosen ? t("inSelectionSuffix") : ""}`}
        >
          <span className={s.vt}>
            <bdi>{name}</bdi>
          </span>
          <span className={`${s.pp} ${p.sale_pct > 0 ? s.ppSale : ""}`}>{price}</span>
        </button>
      )}

      {open && (
        <>
          <button type="button" className={`${s.nav} ${s.prev}`} onClick={() => onStep(-1)} aria-label={t("prev")}>
            ‹
          </button>
          <button type="button" className={`${s.nav} ${s.next}`} onClick={() => onStep(1)} aria-label={t("next")}>
            ›
          </button>

          {p.product_images.length > 0 && (
            <div className={s.pmain}>
              <Image
                src={photoUrl(p.product_images[photoIndex]?.storage_path ?? p.product_images[0].storage_path)}
                alt={t("modelAlt", { name })}
                fill
                sizes="(max-width: 760px) 240px, 400px"
                priority={priority}
              />
              {p.product_images.length > 1 && (
                <div className={s.pth}>
                  {p.product_images.map((img, i) => (
                    <button
                      key={img.storage_path}
                      type="button"
                      aria-label={t("photoN", { n: i + 1 })}
                      aria-pressed={i === photoIndex}
                      onClick={() => setPhotoIndex(i)}
                    >
                      <Image src={photoUrl(img.storage_path)} alt="" fill sizes="40px" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className={s.info} role="group" aria-labelledby={`bolt-title-${p.code}`}>
            <div className={s.infoTop}>
              <span className={s.brand}>
                <bdi>{p.brand}</bdi> · <bdi className="whitespace-nowrap">{p.code}</bdi>
              </span>
              <button
                type="button"
                className={s.heart}
                aria-pressed={saved}
                aria-label={t("save", { name: p.name })}
                onClick={onToggleSaved}
                data-rack-focus={stock === "out" ? "" : undefined}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M12 20 C5 15 3 11 5 8 C7 5 10.5 6 12 8.5 C13.5 6 17 5 19 8 C21 11 19 15 12 20Z"
                    fill="none"
                    stroke="var(--color-emerald)"
                    strokeWidth="1.6"
                  />
                </svg>
              </button>
            </div>
            <h2 id={`bolt-title-${p.code}`} className={s.title}>
              <bdi>{p.name}</bdi>
            </h2>
            <div className={`${s.price} ${p.sale_pct > 0 ? s.priceSale : ""}`}>
              {p.sale_pct > 0 && <span className={s.was}>{t("price", { amount: Number(p.price_sar) })}</span>}
              {t("price", { amount: price })}
            </div>
            <span className={`${s.stock} ${stock === "low" ? s.stockLow : stock === "out" ? s.stockOut : ""}`}>
              {stock === "out" ? t("stockOut") : stock === "low" ? t("stockLow", { n: p.stock }) : t("stockIn")}
            </span>
            <div className={s.lens}>
              <span>
                <bdi>{p.fabric}</bdi>
              </span>
              <span>{printed ? t("workPrinted") : t("workEmbroidered")}</span>
              <span>{t("shirt", { m: Number(p.shirt_m) })}</span>
              <span>{t("dupatta", { m: Number(p.dupatta_m) })}</span>
              <span>{t("trouser", { m: Number(p.trouser_m) })}</span>
            </div>
            {stock !== "out" && (
              <button
                type="button"
                className={`${s.add} ${chosen ? s.added : ""}`}
                aria-pressed={chosen}
                onClick={onToggleChosen}
                data-rack-focus=""
              >
                {chosen ? tHome("added") : tHome("add")}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
