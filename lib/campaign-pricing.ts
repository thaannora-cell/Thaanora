// Pure: safe in server and browser code. A live campaign's discount applies to every suit, or only to suits
// tagged with its occasion. A suit gets the larger of its own sale % and any campaign that covers it (never both).
export type LiveCampaign = { title: Record<string, string>; percent: number; occasion: string | null; endsAt: string | null };

export function campaignSalePct(p: { sale_pct: number; occasions: string[] | null }, campaigns: LiveCampaign[]): number {
  let pct = p.sale_pct ?? 0;
  for (const c of campaigns) {
    if (c.percent > pct && (!c.occasion || (p.occasions ?? []).includes(c.occasion))) pct = c.percent;
  }
  return pct;
}

export function isLiveNow(c: { active: boolean; starts_at: string | null; ends_at: string | null }, now = Date.now()): boolean {
  return c.active && (!c.starts_at || Date.parse(c.starts_at) <= now) && (!c.ends_at || Date.parse(c.ends_at) > now);
}
