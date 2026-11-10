"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import type { RequestStatus as Status } from "@/lib/admin/requests";
import { setRequestStatus } from "@/app/admin/(panel)/requests/actions";

const ALL: Status[] = ["new", "in_progress", "done", "closed"];

export default function RequestStatus({ id, status }: { id: string; status: Status }) {
  const t = useTranslations("Admin.requests");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null);
  const go = (s: Status) =>
    start(async () => {
      const r = await setRequestStatus(id, s);
      setMsg(r.ok ? { text: t("statusSaved", { status: t(`status.${s}`) }) } : { text: t(`errors.${r.error}`), bad: true });
    });
  return (
    <div className="flex flex-col gap-2">
      <div role="group" aria-label={t("colStatus")} className="flex flex-wrap gap-2">
        {ALL.map((s) => (
          <button
            key={s}
            type="button"
            disabled={pending || s === status}
            aria-pressed={s === status}
            onClick={() => go(s)}
            className="min-h-[40px] rounded-full border border-[#CFC3AA] bg-white px-4 text-[14px] font-medium text-emerald aria-pressed:border-emerald aria-pressed:bg-emerald aria-pressed:text-white disabled:cursor-default"
          >
            {t(`status.${s}`)}
          </button>
        ))}
      </div>
      <p role="status" aria-live="polite" className={`m-0 min-h-[20px] text-[14px] ${msg?.bad ? "text-rani" : "text-emerald"}`}>
        {pending ? t("saving") : msg?.text}
      </p>
    </div>
  );
}
