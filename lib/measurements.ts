// Stitching measurements (inches), shared by the shop's tailor screen and My Thaanora.
export const MEASURE_FIELDS = ["bust", "waist", "hips", "shoulder", "shirt", "sleeve", "trouser", "hem"] as const;
export const NECKLINES = ["round", "vNeck", "boat", "collar", "askTailor"] as const;

export type MeasureField = (typeof MEASURE_FIELDS)[number];
export type Measurements = Partial<Record<MeasureField | "neck", string>>;

// Keeps only known fields with sensible values (0–80 inches, half-inch steps; a known neckline).
export function cleanMeasurements(input: unknown): Measurements {
  const out: Measurements = {};
  if (!input || typeof input !== "object") return out;
  const src = input as Record<string, unknown>;
  for (const f of MEASURE_FIELDS) {
    const n = Number(String(src[f] ?? "").replace(",", "."));
    if (String(src[f] ?? "").trim() !== "" && Number.isFinite(n) && n > 0 && n <= 80) out[f] = String(Math.round(n * 2) / 2);
  }
  if (typeof src.neck === "string" && (NECKLINES as readonly string[]).includes(src.neck)) out.neck = src.neck;
  return out;
}

export const hasMeasurements = (m: Measurements) => MEASURE_FIELDS.some((f) => m[f]);
