"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { photoUrl } from "@/lib/product";
import { useSelection } from "./SelectionProvider";
import { useBundleMessage } from "./BundleMessage";

const MAX_CHIPS = 4;

export default function SelectionTray() {
  const sel = useSelection();
  const t = useTranslations("Selection");
  const tHome = useTranslations("Home");
  const tRack = useTranslations("Rack");
  const message = useBundleMessage(sel?.totals.count ?? 0, sel?.bundle ?? null);
  if (!sel) return null;

  const { lines, products, bundle, totals } = sel;
  const segments = bundle ? Math.min(bundle.qty, 6) : 0;
  const filled = Math.min(totals.count, segments);
  const shown = lines.slice(0, MAX_CHIPS);
  const extra = lines.length - shown.length;
  const unlocked = bundle !== null && totals.count >= bundle.qty;

  return (
    <>
      {/* keeps the footer from hiding behind the bar */}
      <div aria-hidden="true" className="h-[calc(76px+env(safe-area-inset-bottom,0px))]" />
      <section
        aria-label={t("trayLabel")}
        className="fixed inset-x-0 bottom-0 z-40 bg-emerald text-ivory-white shadow-[0_-10px_30px_rgba(0,0,0,0.15)] pb-[env(safe-area-inset-bottom,0px)]"
      >
        <div className="mx-auto flex min-h-[76px] max-w-[1320px] items-center gap-3 md:gap-4 px-4">
          {lines.length > 0 && (
            <div className="flex shrink-0 items-center" aria-hidden="true">
              {shown.map((l, i) => {
                const p = products.get(l.code);
                const img = p?.product_images[0];
                return (
                  <span
                    key={l.code}
                    className={`relative block h-[30px] w-[30px] md:h-[38px] md:w-[38px] overflow-hidden rounded-full border-2 border-emerald shadow-[0_0_0_1px_var(--color-gold)] ${i > 0 ? "-ms-2.5" : ""}`}
                    style={{ background: p?.colour_hex }}
                  >
                    {img && <Image src={photoUrl(img.storage_path)} alt="" fill sizes="38px" className="object-cover object-[center_20%]" />}
                  </span>
                );
              })}
              {extra > 0 && <em className="ms-2 text-[13px] not-italic text-[#B9C7C0]">+{extra}</em>}
            </div>
          )}

          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <p className={`m-0 text-[14px] ${unlocked ? "text-gold-light" : ""}`} aria-live="polite">
              {message}
            </p>
            {segments > 0 && (
              <div className="flex max-w-[220px] gap-1" aria-hidden="true">
                {Array.from({ length: segments }, (_, i) => (
                  <i key={i} className={`h-1 flex-1 rounded ${i < filled ? "bg-gold" : "bg-gold-light/25"}`} />
                ))}
              </div>
            )}
          </div>

          {totals.count > 0 && (
            <div className="hidden text-end leading-tight tabular-nums md:block">
              <small className="block text-[12px] text-[#B9C7C0]">
                {totals.subtotal !== totals.total ? (
                  <s>{tRack("price", { amount: totals.subtotal })}</s>
                ) : (
                  t("total")
                )}
              </small>
              <b className="text-[19px] font-medium">{tRack("price", { amount: totals.total })}</b>
            </div>
          )}

          <button
            type="button"
            disabled={totals.count === 0}
            onClick={sel.openDrawer}
            className="shrink-0 min-h-[48px] whitespace-nowrap rounded-full bg-rani px-3.5 md:px-5 font-medium text-white transition-transform hover:-translate-y-0.5 disabled:cursor-default disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {tHome("order")}
          </button>
        </div>
      </section>
    </>
  );
}
