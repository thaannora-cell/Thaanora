"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/admin/session";
import { canOpen } from "@/lib/admin/sections";
import { getSessionClient } from "@/lib/supabase/server";

export type LevelInput = { slug: string; minSuits: number; pct: number; freeGiftBox: boolean; perks: string[]; active: boolean };
const PERKS = ["early_sale", "eid_gift", "priority_sourcing"];

// Save the Circle levels (owner; RLS "owner manages levels"). Suits needed must go up level by level.
export async function saveLevels(levels: LevelInput[]): Promise<{ ok: true } | { ok: false; error: "forbidden" | "suits" | "pct" | "order" | "failed" }> {
  const session = await getSession();
  if (session.state !== "staff" || !canOpen(session.staff.role, "loyalty")) return { ok: false, error: "forbidden" };
  if (!Array.isArray(levels) || levels.length === 0 || levels.length > 10) return { ok: false, error: "failed" };
  for (const l of levels) {
    if (!/^[a-z][a-z0-9_]{1,30}$/.test(l.slug)) return { ok: false, error: "failed" };
    if (!Number.isInteger(l.minSuits) || l.minSuits < 1 || l.minSuits > 1000) return { ok: false, error: "suits" };
    if (!Number.isFinite(l.pct) || l.pct < 0 || l.pct > 50) return { ok: false, error: "pct" };
  }
  const active = levels.filter((l) => l.active).sort((a, b) => a.minSuits - b.minSuits);
  for (let i = 1; i < active.length; i++) {
    if (active[i].minSuits === active[i - 1].minSuits) return { ok: false, error: "order" };
  }
  if (new Set(levels.map((l) => l.minSuits)).size !== levels.length) return { ok: false, error: "order" };

  const supabase = await getSessionClient();
  // min_suits is unique: move every level out of the way first, then write the real values.
  for (const [i, l] of levels.entries()) {
    const r = await supabase.from("loyalty_levels").update({ min_suits: 900 + i }).eq("slug", l.slug);
    if (r.error) return { ok: false, error: "failed" };
  }
  for (const l of levels) {
    const r = await supabase
      .from("loyalty_levels")
      .update({
        min_suits: l.minSuits,
        discount_pct: Math.round(l.pct * 100) / 100,
        free_gift_box: Boolean(l.freeGiftBox),
        perks: (l.perks ?? []).filter((p) => PERKS.includes(p)),
        active: Boolean(l.active),
      })
      .eq("slug", l.slug);
    if (r.error) return { ok: false, error: "failed" };
  }
  revalidatePath("/admin/loyalty");
  revalidatePath("/", "layout");
  return { ok: true };
}
