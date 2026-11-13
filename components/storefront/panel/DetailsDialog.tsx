"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import Modal from "@/components/ui/Modal";
import { photoUrl, salePrice, stockState, type PublicProduct } from "@/lib/product";
import { useSelection } from "../selection/SelectionProvider";
import ReviewsList from "./ReviewsList";
import { feelKey as feelOf } from "@/lib/fabric-feel";
import { Link } from "@/i18n/navigation";


// actions: the shop buttons (add, try on, stitch, share, heart) when opened from the collection grid.
type Props = { product: PublicProduct; open: boolean; onClose: () => void; actions?: React.ReactNode };

export default function DetailsDialog({ product: p, open, onClose, actions }: Props) {
  const t = useTranslations("Panel");
  const tRack = useTranslations("Rack");
  const tHome = useTranslations("Home");
  const stock = stockState(p.stock);
  const price = salePrice(p);
  const feelKey = feelOf(p.fabric);
  const vatPct = useSelection()?.settings.vatPct ?? 0;

  const rows: [string, React.ReactNode][] = [
    [
      t("dPrice"),
      <>
        {p.sale_pct > 0 && <s className="me-2 text-muted">{tRack("price", { amount: Number(p.price_sar) })}</s>}
        {vatPct > 0 ? t("inclVat", { price: tRack("price", { amount: price }) }) : tRack("price", { amount: price })}
      </>,
    ],
    [
      t("dFabric"),
      <>
        <bdi>{p.fabric}</bdi> · {p.work === "Printed" ? tRack("workPrinted") : tRack("workEmbroidered")}
      </>,
    ],
    [t("dFeel"), t(`feel.${feelKey}`)],
    [
      t("dPieces"),
      t("piecesValue", { shirt: Number(p.shirt_m), dupatta: Number(p.dupatta_m), trouser: Number(p.trouser_m) }),
    ],
    [t("dGoodFor"), p.occasions.map((o) => tHome(`o_${o}`)).join(t("listSep"))],
    [t("dCare"), t("careValue")],
    [t("dColour"), t("colourValue")],
    [t("dStock"), stock === "out" ? t("stockOutValue") : t("stockValue", { n: p.stock })],
  ];

  return (
    <Modal open={open} onClose={onClose} wide eyebrow={`${p.brand} · ${p.code}`} title={p.name}>
      {actions}
      {p.product_images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
          {p.product_images.map((img, i) => (
            <div key={img.storage_path} className="relative h-[220px] overflow-hidden rounded-[14px] bg-ivory">
              <Image
                src={photoUrl(img.storage_path)}
                alt={img.alt ?? p.name}
                fill
                sizes="(max-width: 760px) 50vw, 300px"
                className="object-cover object-[center_20%]"
              />
              <span className="absolute bottom-2 start-2 rounded-full bg-ivory-white px-2 py-0.5 text-[11px] text-emerald">
                {i === 0 ? t("onModel") : t("photoN", { n: i + 1 })}
              </span>
            </div>
          ))}
        </div>
      )}

      <table className="w-full border-collapse text-[14px]">
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k} className="border-b border-line align-top">
              <td className="w-[38%] py-2 pe-3 text-muted">{k}</td>
              <td className="py-2">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <span className="th-caps mt-2 text-[11px] font-medium uppercase tracking-[0.16em] text-gold-ink">{t("reviews")}</span>
      {open && <ReviewsList code={p.code} />}
      <Link href={`/suits/${encodeURIComponent(p.code)}`} className="self-start text-[14px] font-medium text-emerald underline underline-offset-2">
        {t("fullPage")}
      </Link>
    </Modal>
  );
}
