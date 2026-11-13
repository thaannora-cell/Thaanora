import { getTranslations } from "next-intl/server";
import type { Perks } from "@/lib/customer/perks";

// Her Thaanora Circle level with a progress bar to the next one. Used on the overview and the Circle page.
export default async function CircleStatus({ perks, compact = false }: { perks: Perks; compact?: boolean }) {
  const t = await getTranslations("Circle");
  const { current, next, toNext, suits } = perks;
  const name = (slug: string) => (t.has(`levels.${slug}`) ? t(`levels.${slug}`) : slug);
  const from = current?.minSuits ?? 0;
  const progress = next ? Math.min(100, Math.round(((suits - from) / Math.max(1, next.minSuits - from)) * 100)) : 100;

  return (
    <div className="flex items-center gap-4">
      <span
        aria-hidden="true"
        className={`grid shrink-0 place-items-center rounded-full border-2 border-gold font-[family-name:var(--font-cinzel)] text-gold-light ${compact ? "h-14 w-14 text-[20px]" : "h-20 w-20 text-[28px]"} ${current ? "bg-emerald" : "bg-emerald/70"}`}
      >
        {current ? name(current.slug).charAt(0) : "T"}
      </span>
      <div className="min-w-0 flex-1">
        <p className="m-0 font-[family-name:var(--font-cormorant)] text-[24px] font-semibold leading-tight text-emerald">
          {current ? name(current.slug) : t("noLevel")}
        </p>
        <p className="m-0 text-[13px] text-muted">{t("suitsCount", { count: suits })}</p>
        {next ? (
          <>
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
              aria-label={t("toNext", { count: toNext, level: name(next.slug) })}
              className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#E9E2D3]"
            >
              <div className="h-full rounded-full bg-gold" style={{ width: `${progress}%` }} />
            </div>
            <p className="m-0 mt-1 text-[13px] text-ink">{t("toNext", { count: toNext, level: name(next.slug) })}</p>
          </>
        ) : (
          <p className="m-0 mt-1 text-[13px] text-ink">{t("topLevel")}</p>
        )}
      </div>
    </div>
  );
}
