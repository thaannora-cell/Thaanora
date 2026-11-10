"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { setAdminLang } from "@/app/admin/actions";

const LANGS = [
  { code: "en", label: "EN" },
  { code: "ar", label: "عربي" },
] as const;

export default function LangToggle({ lang, dark = false }: { lang: "en" | "ar"; dark?: boolean }) {
  const t = useTranslations("Admin.nav");
  const [pending, start] = useTransition();
  return (
    <div role="group" aria-label={t("language")} className={`inline-flex rounded-full border p-[3px] ${dark ? "border-gold/40" : "border-line bg-white"}`}>
      {LANGS.map((l) => (
        <button
          key={l.code}
          type="button"
          lang={l.code}
          aria-pressed={lang === l.code}
          disabled={pending}
          onClick={() => lang !== l.code && start(() => setAdminLang(l.code))}
          className={`min-h-[34px] min-w-[52px] rounded-full px-3 text-[13px] transition-colors ${
            lang === l.code ? "bg-gold font-semibold text-emerald" : dark ? "text-[#DCE5E0] hover:text-gold-light" : "text-emerald hover:bg-ivory"
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
