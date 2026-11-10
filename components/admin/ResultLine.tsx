"use client";

import { useTranslations } from "next-intl";
import type { FormResult } from "@/app/admin/(panel)/offers/actions";

// Shows a form action's outcome: success messages come back as [key, values]; errors as a key.
export default function ResultLine({ result, ns }: { result: FormResult | null | undefined; ns: "offers" | "seasons" }) {
  const t = useTranslations(`Admin.${ns}`);
  let text = "";
  if (result?.ok && result.message) {
    try {
      const [key, args] = JSON.parse(result.message) as [string, Record<string, string | number>];
      text = t(`done.${key}`, args);
    } catch {
      text = "";
    }
  } else if (result && !result.ok && result.error) text = t(`errors.${result.error}`);
  return (
    <p role="status" aria-live="polite" className={`m-0 min-h-[20px] text-[14px] ${result && !result.ok ? "text-rani" : "text-emerald"}`}>
      {text}
    </p>
  );
}
