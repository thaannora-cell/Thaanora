"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import type { PublicProduct } from "@/lib/product";
import Bolt, { type PanelAction } from "./Bolt";
import s from "./rack.module.css";

type Props = {
  products: PublicProduct[];
  activeCode: string | null;
  onActivate: (code: string) => void;
  chosen: string[];
  stitching: string[];
  saved: string[];
  brandOfMonth: string | null;
  onToggleSaved: (code: string) => void;
  onToggleChosen: (code: string) => void;
  onAction: (action: PanelAction, product: PublicProduct) => void;
  emptyMessage: string;
};

const PHONE = "(max-width: 760px)";
const REDUCED = "(prefers-reduced-motion: reduce)";

export default function FabricRack({
  products,
  activeCode,
  onActivate,
  chosen,
  stitching,
  saved,
  brandOfMonth,
  onToggleSaved,
  onToggleChosen,
  onAction,
  emptyMessage,
}: Props) {
  const t = useTranslations("Rack");
  const rackRef = useRef<HTMLDivElement>(null);
  const userOpened = useRef(false);

  const active = products.find((p) => p.code === activeCode) ?? products[0];

  const open = (code: string) => {
    userOpened.current = true;
    onActivate(code);
  };

  const step = (dir: 1 | -1) => {
    if (!active) return;
    const i = products.indexOf(active);
    open(products[(i + dir + products.length) % products.length].code);
  };

  // After the visitor opens a fabric: move focus into its card, and on phones bring it into view
  // once the shelf has finished re-sizing.
  useEffect(() => {
    if (!userOpened.current || !active) return;
    userOpened.current = false;
    const el = rackRef.current?.querySelector<HTMLElement>(`[data-code="${CSS.escape(active.code)}"]`);
    if (!el) return;
    el.querySelector<HTMLElement>("[data-rack-focus]")?.focus({ preventScroll: true });
    if (!window.matchMedia(PHONE).matches) return;
    const reduced = window.matchMedia(REDUCED).matches;
    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      el.scrollIntoView({ block: "start", behavior: reduced ? "auto" : "smooth" });
    };
    if (reduced) {
      go();
      return;
    }
    const onEnd = (e: TransitionEvent) => {
      if (e.target === el && e.propertyName === "height") go();
    };
    el.addEventListener("transitionend", onEnd);
    const fallback = window.setTimeout(go, 800);
    return () => {
      el.removeEventListener("transitionend", onEnd);
      window.clearTimeout(fallback);
    };
  }, [active]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const rtl = document.documentElement.dir === "rtl";
    const forward = (e.key === "ArrowRight") !== rtl;
    step(forward ? 1 : -1);
    e.preventDefault();
  };

  if (products.length === 0) {
    return (
      <div className={s.rack} style={{ height: "auto" }}>
        <p className={s.empty} role="status">
          {emptyMessage}
        </p>
      </div>
    );
  }

  return (
    <div ref={rackRef} className={s.rack} role="list" aria-label={t("label")} onKeyDown={onKeyDown}>
      {products.map((p) => (
        <Bolt
          key={p.code}
          product={p}
          open={p.code === active.code}
          chosen={chosen.includes(p.code)}
          stitched={stitching.includes(p.code)}
          saved={saved.includes(p.code)}
          brandOfMonth={p.brand === brandOfMonth}
          priority={p.code === products[0].code}
          onOpen={() => open(p.code)}
          onStep={step}
          onToggleSaved={() => onToggleSaved(p.code)}
          onToggleChosen={() => onToggleChosen(p.code)}
          onAction={(a) => onAction(a, p)}
        />
      ))}
    </div>
  );
}
