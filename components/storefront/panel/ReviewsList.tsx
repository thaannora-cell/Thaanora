"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

type Review = { id: string; rating: number; body: string; author: string; language: string; reply: string | null; createdAt: string };

// Five stars, filled up to the rating (gold).
export function Stars({ rating, size = 14, label }: { rating: number; size?: number; label?: string }) {
  return (
    <span role="img" aria-label={label} className="inline-flex gap-0.5 align-middle">
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 3.5 L14.3 8.6 L19.8 9.2 L15.7 12.9 L16.8 18.4 L12 15.6 L7.2 18.4 L8.3 12.9 L4.2 9.2 L9.7 8.6 Z"
            fill={n <= Math.round(rating) ? "var(--color-gold)" : "none"}
            stroke="var(--color-gold)"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
        </svg>
      ))}
    </span>
  );
}

// Published reviews of a suit, loaded when the details open.
export default function ReviewsList({ code }: { code: string }) {
  const t = useTranslations("Panel");
  const locale = useLocale();
  const [reviews, setReviews] = useState<Review[] | null>(null);

  useEffect(() => {
    let live = true;
    fetch(`/api/reviews?code=${encodeURIComponent(code)}`)
      .then((r) => (r.ok ? r.json() : { reviews: [] }))
      .then((d: { reviews?: Review[] }) => live && setReviews(d.reviews ?? []))
      .catch(() => live && setReviews([]));
    return () => {
      live = false;
    };
  }, [code]);

  if (reviews === null) return <p className="m-0 text-[14px] text-muted">{t("reviewsLoading")}</p>;
  if (reviews.length === 0) return <p className="m-0 text-[14px] text-muted">{t("noReviews")}</p>;
  const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
  const date = (iso: string) => new Intl.DateTimeFormat(`${locale}-u-ca-gregory`, { month: "long", year: "numeric" }).format(new Date(iso));

  return (
    <div className="flex flex-col gap-3">
      <p className="m-0 flex items-center gap-2 text-[14px]">
        <Stars rating={avg} size={16} label={t("starsLabel", { rating: avg.toFixed(1) })} />
        <span className="text-ink">{t("reviewsSummary", { rating: avg.toFixed(1), count: reviews.length })}</span>
      </p>
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {reviews.map((r) => (
          <li key={r.id} className="rounded-[14px] border border-line bg-white px-3.5 py-3 text-[14px]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Stars rating={r.rating} label={t("starsLabel", { rating: r.rating })} />
              <small className="text-muted">
                <bdi>{r.author}</bdi> · {date(r.createdAt)} · {t("verifiedBuyer")}
              </small>
            </div>
            {r.body && (
              <p lang={r.language} className="mb-0 mt-1.5">
                <bdi>{r.body}</bdi>
              </p>
            )}
            {r.reply && (
              <p className="mb-0 mt-2 border-s-2 border-gold ps-3 text-[13px] text-muted">
                <b className="font-medium text-emerald">{t("ourReply")}</b> <bdi>{r.reply}</bdi>
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
