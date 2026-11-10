import type { AdminLang } from "./i18n";

// Back-office formatting: Riyadh time, Latin digits in both languages (matches the order numbers and the website).
const TZ = "Asia/Riyadh";
const loc = (lang: AdminLang) => (lang === "ar" ? "ar-SA-u-nu-latn-ca-gregory" : "en-GB");

export const amount = (lang: AdminLang, n: number) =>
  new Intl.NumberFormat(loc(lang), { maximumFractionDigits: 0 }).format(Math.round(n));

export const orderTime = (lang: AdminLang, iso: string) =>
  new Intl.DateTimeFormat(loc(lang), { timeZone: TZ, day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(iso));

export const longDate = (lang: AdminLang, d = new Date()) =>
  new Intl.DateTimeFormat(loc(lang), { timeZone: TZ, weekday: "long", day: "numeric", month: "long" }).format(d);

export function partOfDay(d = new Date()): "morning" | "afternoon" | "evening" {
  const h = Number(new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "numeric", hourCycle: "h23" }).format(d));
  return h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
}

// Areas are stored in English ("North Riyadh (Narjis, …)"); the dashboard shows the short zone name.
export type AreaKey = "central" | "north" | "east" | "west" | "south" | "outskirts";
const AREA_KEYS: AreaKey[] = ["central", "north", "east", "west", "south", "outskirts"];
export const areaKey = (area: string): AreaKey | null => {
  const k = area.split(/\s+/)[0]?.toLowerCase() ?? "";
  return AREA_KEYS.find((a) => a === k) ?? null;
};
