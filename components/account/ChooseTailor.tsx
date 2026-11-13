"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { chooseTailor } from "@/app/[locale]/account/actions";

// "Choose as my tailor" / "Remove" on My tailor.
export default function ChooseTailor({ tailorId, chosen }: { tailorId: string; chosen: boolean }) {
  const t = useTranslations("Tailor");
  const locale = useLocale();
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (id: string | null) =>
    start(async () => {
      await chooseTailor(id, locale);
      router.refresh();
    });
  return chosen ? (
    <button type="button" disabled={pending} onClick={() => run(null)} className="min-h-[36px] text-[13px] text-rani underline underline-offset-2 disabled:opacity-60">
      {t("remove")}
    </button>
  ) : (
    <button type="button" disabled={pending} onClick={() => run(tailorId)} className="th-btn min-h-[38px] py-1 text-[13px] disabled:opacity-60">
      {t("choose")}
    </button>
  );
}
