"use client";

import { useLayoutEffect, useRef, useState, useTransition } from "react";
import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

const LANGS: { code: Locale; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "ar", label: "عربي" },
  { code: "ur", label: "اردو" },
  { code: "hi", label: "हिं" },
];

export default function LangSwitcher() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const [active, setActive] = useState<Locale>(locale);
  const [thumb, setThumb] = useState<{ start: number; width: number } | null>(null);
  const groupRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useLayoutEffect(() => {
    const measure = () => {
      const group = groupRef.current;
      const btn = btnRefs.current[active];
      if (!group || !btn) return;
      const rtl = getComputedStyle(group).direction === "rtl";
      const start = rtl
        ? group.clientWidth - (btn.offsetLeft + btn.offsetWidth)
        : btn.offsetLeft;
      setThumb({ start, width: btn.offsetWidth });
    };
    measure();
    document.fonts?.ready.then(measure);
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [active]);

  const choose = (loc: Locale) => {
    if (loc === active) return;
    setActive(loc);
    document.cookie = `NEXT_LOCALE=${loc};path=/;max-age=31536000;samesite=lax`;
    startTransition(() => router.replace(pathname, { locale: loc }));
  };

  return (
    <div
      ref={groupRef}
      className="relative flex border border-line rounded-full overflow-hidden bg-ivory-white shrink-0 px-[3px]"
      role="group"
      aria-label="Language"
    >
      {thumb && (
        <span
          aria-hidden="true"
          className="th-lang-thumb"
          style={{ insetInlineStart: thumb.start, width: thumb.width }}
        />
      )}
      {LANGS.map((l) => (
        <button
          key={l.code}
          ref={(el) => {
            btnRefs.current[l.code] = el;
          }}
          type="button"
          lang={l.code}
          aria-pressed={active === l.code}
          onClick={() => choose(l.code)}
          className={`th-lang-btn relative z-10 my-[2px] rounded-full px-3 py-1.5 text-[13px] min-h-[32px] text-emerald aria-pressed:text-ivory-white ${thumb ? "" : "aria-pressed:bg-emerald"}`}
        >
          <span>{l.label}</span>
        </button>
      ))}
    </div>
  );
}
