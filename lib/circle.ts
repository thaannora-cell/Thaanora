// Thaanora Circle and the birthday gift. Pure: safe in server and browser code.

export type Perk = "early_sale" | "eid_gift" | "priority_sourcing";
export type Level = { slug: string; minSuits: number; pct: number; freeGiftBox: boolean; perks: Perk[] };

// Her level from delivered suits in the last 12 months, the next level and how many suits to reach it.
export function levelFor(suits: number, levels: Level[]): { current: Level | null; next: Level | null; toNext: number } {
  const sorted = [...levels].sort((a, b) => a.minSuits - b.minSuits);
  const current = sorted.filter((l) => l.minSuits <= suits).at(-1) ?? null;
  const next = sorted.find((l) => l.minSuits > suits) ?? null;
  return { current, next, toNext: next ? next.minSuits - suits : 0 };
}

export const BIRTHDAY_DAYS = 7; // usable from 7 days before to 7 days after

// Today's date in Riyadh as yyyy-mm-dd.
export function riyadhToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (day: string, n: number) => iso(new Date(Date.parse(`${day}T00:00:00Z`) + n * 86400000));
const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

// Her birthday in a given year (29 February → 28 February in other years).
export function birthdayIn(birthday: string, year: number): string {
  const [, m, d] = birthday.split("-").map(Number);
  const day = m === 2 && d === 29 && !isLeap(year) ? 28 : d;
  return `${year}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// The current or next gift window: from 7 days before to 7 days after her birthday. `year` is the
// birthday's year, which is how "once a year" is counted.
export function birthdayWindow(birthday: string, today: string): { year: number; date: string; start: string; end: string; open: boolean } {
  const y = Number(today.slice(0, 4));
  for (const year of [y - 1, y, y + 1]) {
    const date = birthdayIn(birthday, year);
    const end = addDays(date, BIRTHDAY_DAYS);
    if (end >= today) {
      const start = addDays(date, -BIRTHDAY_DAYS);
      return { year, date, start, end, open: start <= today };
    }
  }
  // Not reachable (next year's window always ends after today), kept for the type checker.
  const date = birthdayIn(birthday, y + 1);
  return { year: y + 1, date, start: addDays(date, -BIRTHDAY_DAYS), end: addDays(date, BIRTHDAY_DAYS), open: false };
}
