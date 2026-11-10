"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { sectionHref, type SectionKey } from "@/lib/admin/sections";
import AdminIcon from "./AdminIcon";
import LangToggle from "./LangToggle";
import { signOut } from "@/app/admin/actions";

type Props = {
  name: string;
  roleLabel: string;
  lang: "en" | "ar";
  sections: { key: SectionKey; icon: string }[];
  children: React.ReactNode;
};

const navItem =
  "flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start text-[15px] text-[#DCE5E0] no-underline transition-[background-color,transform] duration-200 hover:bg-white/[0.06] hover:translate-x-[3px] rtl:hover:-translate-x-[3px] motion-reduce:hover:translate-x-0 aria-[current=page]:bg-gold aria-[current=page]:font-semibold aria-[current=page]:text-emerald";

// Prototype back-office layout: dark green sidebar (off-canvas ☰ on phones) and the main area.
export default function AdminShell({ name, roleLabel, lang, sections, children }: Props) {
  const t = useTranslations("Admin.nav");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuBtn = useRef<HTMLButtonElement>(null);
  const firstLink = useRef<HTMLAnchorElement>(null);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    firstLink.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        menuBtn.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const current = (key: SectionKey) => {
    const href = sectionHref(key);
    return href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[250px_minmax(0,1fr)]">
      {open && <div aria-hidden="true" className="fixed inset-0 z-[94] bg-emerald-deep/50 md:hidden" onClick={() => setOpen(false)} />}

      <aside
        id="admin-nav"
        aria-label={t("label")}
        className={`fixed inset-y-0 start-0 z-[95] flex w-[270px] flex-col gap-1 overflow-y-auto bg-emerald-deep px-3.5 py-[22px] text-[#C9D6CF] transition-[transform,visibility] duration-300 motion-reduce:transition-none md:sticky md:top-0 md:h-dvh md:w-auto ${
          open ? "" : "max-md:invisible max-md:-translate-x-full max-md:rtl:translate-x-full"
        }`}
      >
        <div className="mb-2.5 flex items-center gap-2.5 border-b border-gold/25 px-2 pb-[18px]">
          <span aria-hidden="true" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold font-[family-name:var(--font-cinzel)] text-[18px] font-semibold text-emerald">
            T
          </span>
          <span className="min-w-0">
            <b className="block font-[family-name:var(--font-cinzel)] text-[16px] font-semibold tracking-[0.16em] text-white">THAANORA</b>
            <small className="block truncate text-[12px] text-gold-light">
              <bdi>{name}</bdi> · {roleLabel}
            </small>
          </span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label={t("closeMenu")}
            className="ms-auto inline-flex h-9 w-9 items-center justify-center rounded-full text-[20px] text-gold-light md:hidden"
          >
            ×
          </button>
        </div>

        <nav className="flex flex-col gap-1">
          {sections.map((s, i) => (
            <Link key={s.key} ref={i === 0 ? firstLink : undefined} href={sectionHref(s.key)} aria-current={current(s.key) ? "page" : undefined} className={navItem}>
              <AdminIcon name={s.icon} className={current(s.key) ? "text-emerald" : "text-gold-light"} />
              {t(s.key)}
            </Link>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-1.5 border-t border-gold/25 pt-3.5">
          <div className="px-2 pb-1">
            <LangToggle lang={lang} dark />
          </div>
          <a href="/" target="_blank" rel="noopener" className={navItem}>
            <AdminIcon name="site" className="text-gold-light" />
            {t("viewSite")}
          </a>
          <form action={signOut}>
            <button type="submit" className={navItem}>
              <AdminIcon name="out" className="text-gold-light" />
              {t("signOut")}
            </button>
          </form>
        </div>
      </aside>

      <div className="min-w-0">
        <div className="sticky top-0 z-[90] flex items-center gap-3 border-b border-[#E1E6DF] bg-[#EEF1EC]/95 px-4 py-2.5 backdrop-blur md:hidden">
          <button
            ref={menuBtn}
            type="button"
            onClick={() => setOpen(true)}
            aria-expanded={open}
            aria-controls="admin-nav"
            className="inline-flex min-h-[42px] items-center gap-2 rounded-full border border-[#CFC3AA] bg-white px-4 text-[15px] text-emerald"
          >
            <span aria-hidden="true">☰</span>
            {t("menu")}
          </button>
          <span className="font-[family-name:var(--font-cinzel)] text-[14px] font-semibold tracking-[0.16em] text-emerald">THAANORA</span>
        </div>
        <main className="px-4 pb-10 pt-4 md:px-[22px] md:pt-[22px]">{children}</main>
      </div>
    </div>
  );
}
