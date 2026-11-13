"use client";

import ProductCard from "./ProductCard";
import type { PublicProduct } from "@/lib/product";

type Props = {
  id: string;
  eyebrow: string;
  title: string;
  intro?: string;
  items: { product: PublicProduct; note?: string | null }[];
  saved: string[];
  onOpen: (code: string) => void;
  onToggleSaved: (code: string) => void;
};

// A titled row of suit cards that scrolls sideways (Trending, Our picks, For you). Swipe on phones.
export default function ProductRow({ id, eyebrow, title, intro, items, saved, onOpen, onToggleSaved }: Props) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby={id} className="mt-10">
      <p className="th-caps m-0 font-[family-name:var(--font-cinzel)] text-[12px] tracking-[0.16em] text-gold-ink">{eyebrow}</p>
      <h2 id={id} className="m-0 font-[family-name:var(--font-cormorant)] text-[28px] font-semibold leading-tight text-emerald md:text-[32px]">
        {title}
      </h2>
      {intro && <p className="m-0 text-[13px] text-muted">{intro}</p>}
      <ul className="-mx-4 mt-3 flex list-none snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 md:gap-4" style={{ scrollbarWidth: "thin" }}>
        {items.map(({ product, note }) => (
          <li key={product.code} className="w-[46%] shrink-0 snap-start sm:w-[30%] md:w-[22%] lg:w-[18%]">
            <ProductCard product={product} note={note} saved={saved.includes(product.code)} onOpen={onOpen} onToggleSaved={onToggleSaved} sizes="(max-width: 640px) 46vw, (max-width: 1024px) 25vw, 18vw" />
          </li>
        ))}
      </ul>
    </section>
  );
}
