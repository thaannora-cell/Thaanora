"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { saveLevels, type LevelInput } from "@/app/admin/(panel)/loyalty/actions";

const PERKS = ["early_sale", "eid_gift", "priority_sourcing"] as const;
const field = "th-field w-[90px] text-[15px]";

// Edit each Circle level: suits needed, % off, free gift box, extra perks, on/off.
export default function LevelsForm({ levels, counts }: { levels: LevelInput[]; counts: Record<string, number> }) {
  const t = useTranslations("Admin.loyalty");
  const router = useRouter();
  const [rows, setRows] = useState(levels);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null);
  const set = (slug: string, patch: Partial<LevelInput>) => setRows((r) => r.map((l) => (l.slug === slug ? { ...l, ...patch } : l)));

  return (
    <div className="flex flex-col gap-3">
      <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 lg:grid-cols-3">
        {rows.map((l) => (
          <li key={l.slug} className={`rounded-[16px] border p-4 ${l.active ? "border-gold bg-white" : "border-[#E1E6DF] bg-[#F7F7F5] opacity-80"}`}>
            <div className="mb-2 flex items-center justify-between gap-2">
              <b className="font-[family-name:var(--font-cormorant)] text-[22px] text-emerald">{t(`name.${l.slug as "silver"}`)}</b>
              <small className="text-muted">{t("customers", { count: counts[l.slug] ?? 0 })}</small>
            </div>
            <div className="flex flex-wrap gap-3">
              <label className="flex flex-col gap-1 text-[13px] text-muted">
                {t("minSuits")}
                <input type="number" min={1} max={1000} value={l.minSuits} onChange={(e) => set(l.slug, { minSuits: Number(e.target.value) })} className={field} />
              </label>
              <label className="flex flex-col gap-1 text-[13px] text-muted">
                {t("pct")}
                <input type="number" min={0} max={50} step={0.5} value={l.pct} onChange={(e) => set(l.slug, { pct: Number(e.target.value) })} className={field} />
              </label>
            </div>
            <label className="mt-3 flex items-center gap-2 text-[14px]">
              <input type="checkbox" checked={l.freeGiftBox} onChange={(e) => set(l.slug, { freeGiftBox: e.target.checked })} />
              {t("giftBox")}
            </label>
            {PERKS.map((p) => (
              <label key={p} className="mt-1.5 flex items-center gap-2 text-[14px]">
                <input type="checkbox" checked={l.perks.includes(p)} onChange={(e) => set(l.slug, { perks: e.target.checked ? [...l.perks, p] : l.perks.filter((x) => x !== p) })} />
                {t(`perk.${p}`)}
              </label>
            ))}
            <label className="mt-3 flex items-center gap-2 border-t border-[#F0EBE1] pt-2 text-[14px] text-muted">
              <input type="checkbox" checked={l.active} onChange={(e) => set(l.slug, { active: e.target.checked })} />
              {t("active")}
            </label>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await saveLevels(rows);
              setMsg(r.ok ? { text: t("saved") } : { text: t(`errors.${r.error}`), bad: true });
              router.refresh();
            })
          }
          className="min-h-[46px] rounded-full bg-rani px-6 text-[15px] font-medium text-white disabled:opacity-60"
        >
          {pending ? t("saving") : t("save")}
        </button>
        <p role="status" aria-live="polite" className={`m-0 text-[14px] ${msg?.bad ? "text-rani" : "text-emerald"}`}>
          {msg?.text}
        </p>
      </div>
    </div>
  );
}
