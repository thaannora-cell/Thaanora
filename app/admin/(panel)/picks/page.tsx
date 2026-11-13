import Link from "next/link";
import { redirect } from "next/navigation";
import SectionDenied from "@/components/admin/SectionDenied";
import { getSession } from "@/lib/admin/session";
import { getAdminT } from "@/lib/admin/i18n";
import { canOpen } from "@/lib/admin/sections";
import { getVisibleProducts } from "@/lib/products";
import { getLiveCampaigns } from "@/lib/campaigns";
import { trendingCodes } from "@/lib/recommend";

export const dynamic = "force-dynamic";

const panel = "min-w-0 rounded-[18px] border border-[#E1E6DF] bg-white p-[18px] shadow-[0_6px_18px_rgba(14,59,46,0.05)]";

// What the home page shows right now: "Trending in Riyadh" (pinned Trending # first, then the last
// 7 days of orders, adds and opens) and "Our picks" with their notes. Changed per suit in Products.
export default async function PicksPage() {
  const session = await getSession();
  if (session.state !== "staff") redirect("/admin/sign-in");
  if (!canOpen(session.staff.role, "picks")) return <SectionDenied role={session.staff.role} section="picks" />;
  const [t, result] = await Promise.all([getAdminT(), getLiveCampaigns().then((c) => getVisibleProducts(c))]);
  const products = result.status === "ok" ? result.products : [];
  const byCode = new Map(products.map((p) => [p.code, p]));
  const trending = (await trendingCodes(products)).map((c) => byCode.get(c)!).filter(Boolean);
  const picks = products.filter((p) => p.is_pick);

  return (
    <>
      <div className="mb-[18px]">
        <h1 className="m-0 font-[family-name:var(--font-cormorant)] text-[28px] font-semibold leading-tight text-emerald md:text-[34px]">{t("picks.title")}</h1>
        <p className="m-0 text-[14px] text-muted">
          {t("picks.sub")}{" "}
          <Link href="/admin/products" className="text-emerald underline">
            {t("picks.productsLink")}
          </Link>
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className={panel} aria-labelledby="trend">
          <h2 id="trend" className="m-0 mb-1 text-[16px] font-semibold text-emerald">
            {t("picks.trendingTitle")}
          </h2>
          <p className="m-0 mb-3 text-[13px] text-muted">{t("picks.trendingHint")}</p>
          {trending.length === 0 ? (
            <p className="m-0 text-[14px] text-muted">{t("picks.noTrending")}</p>
          ) : (
            <ol className="m-0 flex list-none flex-col p-0">
              {trending.map((p, i) => (
                <li key={p.code} className="flex items-center justify-between gap-3 border-b border-[#F0EBE1] py-2 text-[14px] last:border-b-0">
                  <span className="min-w-0">
                    <b className="me-2 tabular-nums text-gold-ink">{i + 1}</b>
                    <bdi>{p.name}</bdi> <small className="text-muted" dir="ltr">{p.code}</small>
                  </span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${p.trending_rank ? "bg-emerald text-gold-light" : "bg-[#F6EEDC] text-gold-ink"}`}>
                    {p.trending_rank ? t("picks.pinned", { rank: p.trending_rank }) : t("picks.byActivity")}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
        <section className={panel} aria-labelledby="ours">
          <h2 id="ours" className="m-0 mb-1 text-[16px] font-semibold text-emerald">
            {t("picks.picksTitle", { count: picks.length })}
          </h2>
          <p className="m-0 mb-3 text-[13px] text-muted">{t("picks.picksHint")}</p>
          {picks.length === 0 ? (
            <p className="m-0 text-[14px] text-muted">{t("picks.noPicks")}</p>
          ) : (
            <ul className="m-0 flex list-none flex-col p-0">
              {picks.map((p) => (
                <li key={p.code} className="border-b border-[#F0EBE1] py-2 text-[14px] last:border-b-0">
                  <bdi className="font-medium text-emerald">{p.name}</bdi> <small className="text-muted" dir="ltr">{p.code}</small>
                  {p.pick_note?.en ? <small className="block italic text-muted">“{p.pick_note.en}”</small> : <small className="block text-rani">{t("picks.noNote")}</small>}
                  {p.stock < 1 && <small className="block text-rani">{t("picks.soldOut")}</small>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
