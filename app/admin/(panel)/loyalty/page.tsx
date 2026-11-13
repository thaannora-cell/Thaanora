import Link from "next/link";
import { redirect } from "next/navigation";
import SectionDenied from "@/components/admin/SectionDenied";
import LevelsForm from "@/components/admin/loyalty/LevelsForm";
import { getSession } from "@/lib/admin/session";
import { getAdminT } from "@/lib/admin/i18n";
import { canOpen } from "@/lib/admin/sections";
import { getSessionClient } from "@/lib/supabase/server";
import { levelFor, type Level, type Perk } from "@/lib/circle";

export const dynamic = "force-dynamic";

// Thaanora Circle levels (owner): rules, % off, gift box and perks, with how many customers are at each.
export default async function LoyaltyPage() {
  const session = await getSession();
  if (session.state !== "staff") redirect("/admin/sign-in");
  if (!canOpen(session.staff.role, "loyalty")) return <SectionDenied role={session.staff.role} section="loyalty" />;
  const supabase = await getSessionClient();
  const [{ data: levels }, { data: stats }, t] = await Promise.all([
    supabase.from("loyalty_levels").select("slug, min_suits, discount_pct, free_gift_box, perks, active").order("sort_order"),
    supabase.from("customer_stats").select("suits_12m"),
    getAdminT(),
  ]);
  const all = (levels ?? []).map((l) => ({ slug: l.slug, minSuits: l.min_suits, pct: Number(l.discount_pct), freeGiftBox: l.free_gift_box, perks: (l.perks ?? []) as Perk[], active: l.active }));
  const live: Level[] = all.filter((l) => l.active);
  const counts: Record<string, number> = {};
  for (const s of stats ?? []) {
    const slug = levelFor(s.suits_12m, live).current?.slug ?? "none";
    counts[slug] = (counts[slug] ?? 0) + 1;
  }

  return (
    <>
      <div className="mb-[18px]">
        <h1 className="m-0 font-[family-name:var(--font-cormorant)] text-[28px] font-semibold leading-tight text-emerald md:text-[34px]">{t("loyalty.title")}</h1>
        <p className="m-0 text-[14px] text-muted">{t("loyalty.sub", { none: counts.none ?? 0 })}</p>
      </div>
      <LevelsForm levels={all} counts={counts} />
      <p className="mb-0 mt-4 text-[13px] text-muted">
        {t("loyalty.birthdayNote")}{" "}
        <Link href="/admin/settings" className="text-emerald underline">
          {t("loyalty.settingsLink")}
        </Link>
      </p>
    </>
  );
}
