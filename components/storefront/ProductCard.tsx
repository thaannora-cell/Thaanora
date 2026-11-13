"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { photoUrl, salePrice, stockState, type PublicProduct } from "@/lib/product";

type Props = {
  product: PublicProduct;
  saved: boolean;
  onOpen: (code: string) => void; // opens the suit's pop-up
  onToggleSaved: (code: string) => void;
  note?: string | null; // "Our picks": the owner's note
  sizes?: string;
};

// One suit as a card (collection grid, Trending, Our picks, For you): photo, tags, brand, name, price,
// stock and the heart. Tapping it opens the pop-up with the shop actions; it is also a link to the suit page.
export default function ProductCard({ product: p, saved, onOpen, onToggleSaved, note, sizes = "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw" }: Props) {
  const t = useTranslations("Collection");
  const tRack = useTranslations("Rack");
  const photo = [...p.product_images].sort((a, b) => a.sort_order - b.sort_order)[0];
  const price = salePrice(p);
  const stock = stockState(p.stock);

  return (
    <div className="th-lift relative flex h-full flex-col overflow-hidden rounded-[18px] border border-line bg-ivory-white shadow-[0_6px_18px_rgba(14,59,46,0.06)]">
      {/* A real link to the suit's own page (search engines, open in a new tab); a plain tap opens the pop-up. */}
      <Link
        href={`/suits/${encodeURIComponent(p.code)}`}
        onClick={(e) => {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
          e.preventDefault();
          onOpen(p.code);
        }}
        className="flex flex-1 flex-col text-start text-inherit no-underline"
        aria-label={t("open", { name: `${p.brand} ${p.name}` })}
      >
        <span className="relative block aspect-[3/4] w-full overflow-hidden" style={{ background: p.colour_hex }}>
          {photo && <Image src={photoUrl(photo.storage_path)} alt={photo.alt ?? `${p.brand} — ${p.name}`} fill sizes={sizes} className="object-cover object-[center_20%]" />}
          <span className="absolute start-2 top-2 flex flex-col items-start gap-1">
            {p.sale_pct > 0 && <span className="rounded-full bg-rani px-2 py-0.5 text-[11px] font-semibold text-white">−{p.sale_pct}%</span>}
            {p.is_new && <span className="rounded-full bg-gold px-2 py-0.5 text-[11px] font-semibold text-emerald">{t("new")}</span>}
          </span>
          {stock === "out" && <span className="absolute inset-x-0 bottom-0 bg-emerald/85 py-1 text-center text-[12px] text-gold-light">{t("soldOut")}</span>}
        </span>
        <span className="flex flex-1 flex-col gap-0.5 p-3">
          <small className="text-[11px] text-gold-ink">{p.brand}</small>
          <span className="line-clamp-2 text-[14px] font-medium leading-snug text-emerald">{p.name}</span>
          {note && <span className="line-clamp-3 text-[12px] italic text-muted">“{note}”</span>}
          <span className="mt-auto pt-1 text-[14px]">
            {p.sale_pct > 0 && <s className="me-1.5 text-[12px] text-muted">{tRack("price", { amount: p.price_sar })}</s>}
            <span className={p.sale_pct > 0 ? "font-semibold text-rani" : "font-medium text-ink"}>{tRack("price", { amount: price })}</span>
          </span>
          {stock === "low" && <small className="text-[11px] text-rani">{t("fewLeft", { count: p.stock })}</small>}
        </span>
      </Link>
      <button
        type="button"
        onClick={() => onToggleSaved(p.code)}
        aria-pressed={saved}
        aria-label={saved ? t("unsave", { name: p.name }) : t("save", { name: p.name })}
        className="absolute end-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-ivory-white/90 shadow"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill={saved ? "var(--color-rani)" : "none"} stroke="var(--color-rani)" strokeWidth="1.8">
          <path d="M12 20 C5 15 3 11.5 3 8.5 A4.5 4.5 0 0 1 12 6.5 A4.5 4.5 0 0 1 21 8.5 C21 11.5 19 15 12 20Z" />
        </svg>
      </button>
    </div>
  );
}
