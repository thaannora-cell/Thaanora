"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { markWhatsapp } from "@/app/admin/(panel)/notifications/actions";
import type { QueuedMessage } from "@/lib/admin/whatsapp-queue";

// One waiting WhatsApp message: open it in WhatsApp (ticks it as sent) or skip it.
export default function QueueItem({ item, when }: { item: QueuedMessage; when: string }) {
  const t = useTranslations("Admin.notifications");
  const [done, setDone] = useState<"sent" | "skipped" | null>(null);
  const [pending, start] = useTransition();
  const mark = (outcome: "sent" | "skipped") =>
    start(async () => {
      const r = await markWhatsapp(item.id, outcome);
      if (r.ok) setDone(outcome);
    });

  return (
    <li className={`flex flex-col gap-2 border-b border-[#F0EBE1] py-3 last:border-b-0 ${done ? "opacity-60" : ""}`}>
      <div className="flex flex-wrap items-center gap-2 text-[14px]">
        <b className="font-medium text-emerald">
          <bdi>{item.customer}</bdi>
        </b>
        <bdi dir="ltr" className="text-muted">
          {item.phone}
        </bdi>
        <span className="rounded-full bg-[#F6EEDC] px-2 py-0.5 text-[12px] text-gold-ink">{t(`types.${item.type}`)}</span>
        {item.ref && item.link && (
          <Link href={item.link} dir="ltr" className="text-[13px] text-emerald underline underline-offset-2">
            {item.ref}
          </Link>
        )}
        <small className="ms-auto text-[12px] text-muted">{when}</small>
      </div>
      {item.text && (
        <pre className="m-0 max-h-[150px] overflow-auto whitespace-pre-wrap rounded-xl bg-[#F4F7F4] p-3 font-[family-name:var(--font-jost)] text-[13px] text-ink" dir="auto">
          {item.text}
        </pre>
      )}
      {done ? (
        <p role="status" className="m-0 text-[13px] text-emerald">
          {t(done === "sent" ? "markedSent" : "markedSkipped")}
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {item.url ? (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => mark("sent")}
              className="inline-flex min-h-[44px] items-center rounded-full bg-rani px-5 text-[15px] font-medium text-white no-underline"
            >
              {t("open")}
            </a>
          ) : (
            <span className="text-[13px] text-rani">{t("noPhone")}</span>
          )}
          <button type="button" disabled={pending} onClick={() => mark("skipped")} className="min-h-[44px] rounded-full border border-[#CFC3AA] bg-white px-4 text-[14px] text-emerald disabled:opacity-60">
            {t("skip")}
          </button>
        </div>
      )}
    </li>
  );
}
