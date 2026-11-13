"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { saveCustomerNotes, setCustomerStatus } from "@/app/admin/(panel)/customers/actions";

const TAGS = ["vip", "wholesale", "trusted"] as const;

// Staff-only tags and notes, and reactivating a deactivated profile.
export default function CustomerNotesForm({ id, tags, notes, status }: { id: string; tags: string[]; notes: string | null; status: "active" | "deactivated" }) {
  const t = useTranslations("Admin.customers");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [chosen, setChosen] = useState<string[]>(tags);
  const [text, setText] = useState(notes ?? "");
  const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null);
  const save = () =>
    start(async () => {
      const r = await saveCustomerNotes(id, chosen, text);
      setMsg(r.ok ? { text: t("saved") } : { text: t("failed"), bad: true });
      router.refresh();
    });
  const flip = (next: "active" | "deactivated") =>
    start(async () => {
      if (!window.confirm(t(next === "active" ? "reactivateConfirm" : "deactivateConfirm"))) return;
      const r = await setCustomerStatus(id, next);
      setMsg(r.ok ? { text: t("saved") } : { text: t("failed"), bad: true });
      router.refresh();
    });

  return (
    <div className="flex flex-col gap-3">
      <fieldset className="m-0 border-0 p-0">
        <legend className="mb-1.5 text-[13px] text-muted">{t("tagsLabel")}</legend>
        <div className="flex flex-wrap gap-2">
          {TAGS.map((x) => {
            const on = chosen.includes(x);
            return (
              <label key={x} className={`inline-flex min-h-[40px] cursor-pointer items-center gap-2 rounded-full border px-3.5 text-[14px] ${on ? "border-emerald bg-emerald text-white" : "border-[#CFC3AA] bg-white text-emerald"}`}>
                <input type="checkbox" className="sr-only" checked={on} onChange={() => setChosen((c) => (on ? c.filter((y) => y !== x) : [...c, x]))} />
                {t(`tag.${x}`)}
              </label>
            );
          })}
        </div>
        <p className="m-0 mt-1.5 text-[12px] text-muted">{t("trustedHint")}</p>
      </fieldset>
      <label className="flex flex-col gap-1.5 text-[13px] text-muted">
        {t("notesLabel")}
        <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} rows={3} className="th-field text-[14px]" placeholder={t("notesPlaceholder")} />
      </label>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={pending} onClick={save} className="min-h-[44px] rounded-full bg-emerald px-5 text-[14px] font-medium text-white disabled:opacity-60">
          {t("save")}
        </button>
        {status === "deactivated" ? (
          <button type="button" disabled={pending} onClick={() => flip("active")} className="min-h-[44px] rounded-full border border-[#CFC3AA] bg-white px-5 text-[14px] text-emerald disabled:opacity-60">
            {t("reactivate")}
          </button>
        ) : (
          <button type="button" disabled={pending} onClick={() => flip("deactivated")} className="min-h-[44px] rounded-full border border-[#CFC3AA] bg-white px-5 text-[14px] text-muted disabled:opacity-60">
            {t("deactivate")}
          </button>
        )}
      </div>
      <p role="status" aria-live="polite" className={`m-0 min-h-[18px] text-[13px] ${msg?.bad ? "text-rani" : "text-emerald"}`}>
        {pending ? t("saving") : msg?.text}
      </p>
    </div>
  );
}
