import Link from "next/link";
import { redirect } from "next/navigation";
import SectionDenied from "@/components/admin/SectionDenied";
import ReviewModeration from "@/components/admin/reviews/ReviewModeration";
import { getSession } from "@/lib/admin/session";
import { getAdminLang, getAdminT } from "@/lib/admin/i18n";
import { canOpen } from "@/lib/admin/sections";
import { orderTime } from "@/lib/admin/format";
import { REVIEW_STATUSES, isReviewStatus, listReviews } from "@/lib/admin/reviews";

export const dynamic = "force-dynamic";

const chipLink =
  "inline-flex min-h-[36px] items-center whitespace-nowrap rounded-full border border-[#DDD3C0] bg-white px-3 text-[13px] text-emerald no-underline aria-[current=page]:border-emerald aria-[current=page]:bg-emerald aria-[current=page]:text-white";
const TONE = { pending: "bg-[#F6EEDC] text-gold-ink", published: "bg-[#E4F1EA] text-emerald", hidden: "bg-[#F1EEE8] text-muted" } as const;

// Customers' reviews: waiting ones first by default. Publish, hide, reply.
export default async function ReviewsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const session = await getSession();
  if (session.state !== "staff") redirect("/admin/sign-in");
  if (!canOpen(session.staff.role, "reviews")) return <SectionDenied role={session.staff.role} section="reviews" />;
  const sp = await searchParams;
  const status = sp.status === "all" ? null : isReviewStatus(sp.status) ? sp.status : "pending";
  const [data, t, lang] = [await listReviews(status), await getAdminT(), await getAdminLang()];
  const total = Object.values(data.counts).reduce((a, b) => a + b, 0);

  return (
    <>
      <div className="mb-[18px]">
        <h1 className="m-0 font-[family-name:var(--font-cormorant)] text-[28px] font-semibold leading-tight text-emerald md:text-[34px]">{t("reviews.title")}</h1>
        <p className="m-0 text-[14px] text-muted">{t("reviews.sub")}</p>
      </div>
      <nav aria-label={t("reviews.byStatus")} className="-mx-4 mb-3 overflow-x-auto px-4 md:mx-0 md:px-0">
        <ul className="m-0 flex list-none gap-1.5 p-0 md:flex-wrap">
          {REVIEW_STATUSES.map((s) => (
            <li key={s}>
              <Link href={`/admin/reviews?status=${s}`} aria-current={status === s ? "page" : undefined} className={chipLink}>
                {t(`reviews.status.${s}`)} ({data.counts[s]})
              </Link>
            </li>
          ))}
          <li>
            <Link href="/admin/reviews?status=all" aria-current={!status ? "page" : undefined} className={chipLink}>
              {t("reviews.all")} ({total})
            </Link>
          </li>
        </ul>
      </nav>
      {data.failed && (
        <p role="alert" className="mb-4 rounded-xl border border-rani/30 bg-[#FBE7EE] px-3 py-2.5 text-[14px] text-rani">
          {t("dashboard.loadFailed")}
        </p>
      )}
      {data.rows.length === 0 ? (
        <p className="m-0 rounded-[18px] border border-[#E1E6DF] bg-white p-5 text-[14px] text-muted">{t("reviews.none")}</p>
      ) : (
        <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 lg:grid-cols-2">
          {data.rows.map((r) => (
            <li key={r.id} className="min-w-0 rounded-[18px] border border-[#E1E6DF] bg-white p-[18px] shadow-[0_6px_18px_rgba(14,59,46,0.05)]">
              <div className="mb-1 flex flex-wrap items-start justify-between gap-2">
                <span className="min-w-0">
                  <bdi className="block font-medium text-emerald">{r.product}</bdi>
                  <small className="text-muted">
                    <span dir="ltr">{r.code}</span> · <bdi>{r.author}</bdi> · {orderTime(lang, r.createdAt)}
                  </small>
                </span>
                <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-medium ${TONE[r.status]}`}>{t(`reviews.status.${r.status}`)}</span>
              </div>
              <p className="m-0 text-[18px] tracking-[2px] text-gold" aria-label={t("reviews.stars", { n: r.rating })}>
                {"★".repeat(r.rating)}
                <span className="text-[#E3D9C6]">{"★".repeat(5 - r.rating)}</span>
              </p>
              {r.body ? (
                <p lang={r.language} className="mb-3 mt-1 text-[14px]">
                  <bdi>{r.body}</bdi>
                </p>
              ) : (
                <p className="mb-3 mt-1 text-[13px] text-muted">{t("reviews.noText")}</p>
              )}
              <ReviewModeration id={r.id} status={r.status} reply={r.reply} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
