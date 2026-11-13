"use client";

import { useActionState, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { saveReview, type ReviewState } from "@/app/[locale]/account/care-actions";

// Stars (1–5) and a short review for one suit. Saved reviews wait for approval.
export default function ReviewForm({ code, initial }: { code: string; initial: { rating: number; body: string } | null }) {
  const t = useTranslations("Reviews");
  const locale = useLocale();
  const [state, action, pending] = useActionState<ReviewState, FormData>(saveReview, {});
  const [rating, setRating] = useState(initial?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const shown = hover || rating;

  return (
    <form action={action} className="flex flex-col gap-2.5">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="code" value={code} />
      <fieldset className="m-0 border-0 p-0">
        <legend className="mb-1 text-[13px] text-muted">{t("ratingLabel")}</legend>
        <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer" onMouseEnter={() => setHover(n)}>
              <input type="radio" name="rating" value={n} checked={rating === n} onChange={() => setRating(n)} className="sr-only" required />
              <span className="sr-only">{t("starsN", { n })}</span>
              <svg width="32" height="32" viewBox="0 0 24 24" aria-hidden="true" className="transition-transform hover:scale-110">
                <path
                  d="M12 3.5 L14.3 8.6 L19.8 9.2 L15.7 12.9 L16.8 18.4 L12 15.6 L7.2 18.4 L8.3 12.9 L4.2 9.2 L9.7 8.6 Z"
                  fill={n <= shown ? "var(--color-gold)" : "none"}
                  stroke="var(--color-gold)"
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                />
              </svg>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex flex-col gap-1 text-[13px] text-muted">
        {t("bodyLabel")}
        <textarea name="body" maxLength={800} rows={3} defaultValue={initial?.body ?? ""} placeholder={t("bodyPlaceholder")} className="th-field text-[16px]" />
      </label>
      {state.error && (
        <p role="alert" className="m-0 text-[13px] text-rani">
          {t(`errors.${state.error}`)}
        </p>
      )}
      {state.ok && (
        <p role="status" className="m-0 text-[13px] text-emerald">
          {t("saved")}
        </p>
      )}
      <button type="submit" disabled={pending || rating === 0} className="th-btn self-start disabled:opacity-60">
        {pending ? t("saving") : initial ? t("update") : t("submit")}
      </button>
    </form>
  );
}
