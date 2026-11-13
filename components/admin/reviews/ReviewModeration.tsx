"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { moderateReview } from "@/app/admin/(panel)/reviews/actions";

// Publish / hide a review and reply to it.
export default function ReviewModeration({ id, status, reply }: { id: string; status: "pending" | "published" | "hidden"; reply: string | null }) {
  const t = useTranslations("Admin.reviews");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [text, setText] = useState(reply ?? "");
  const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null);
  const go = (next: "published" | "hidden" | null, withReply: boolean) =>
    start(async () => {
      const r = await moderateReview(id, next, withReply ? text : null);
      setMsg(r.ok ? { text: t("saved") } : { text: t("failed"), bad: true });
      router.refresh();
    });
  const btn = "min-h-[40px] rounded-full px-4 text-[14px] font-medium disabled:opacity-60";
  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-1 text-[13px] text-muted">
        {t("replyLabel")}
        <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={600} rows={2} className="th-field text-[14px]" />
      </label>
      <div className="flex flex-wrap gap-2">
        {status !== "published" && (
          <button type="button" disabled={pending} onClick={() => go("published", true)} className={`${btn} bg-emerald text-white`}>
            {t("publish")}
          </button>
        )}
        {status !== "hidden" && (
          <button type="button" disabled={pending} onClick={() => go("hidden", false)} className={`${btn} border border-[#CFC3AA] bg-white text-emerald`}>
            {t("hide")}
          </button>
        )}
        {status === "published" && (
          <button type="button" disabled={pending || text === (reply ?? "")} onClick={() => go(null, true)} className={`${btn} border border-[#CFC3AA] bg-white text-emerald`}>
            {t("saveReply")}
          </button>
        )}
      </div>
      <p role="status" aria-live="polite" className={`m-0 min-h-[18px] text-[13px] ${msg?.bad ? "text-rani" : "text-emerald"}`}>
        {pending ? t("saving") : msg?.text}
      </p>
    </div>
  );
}
