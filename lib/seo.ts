import { routing } from "@/i18n/routing";

// The site's public address for search engines (canonical links, sitemap, structured data).
// Set SITE_URL (e.g. https://thaanora.com) in Vercel at launch; Vercel's production domain is the fallback.
export function siteUrl(): string {
  const set = process.env.SITE_URL?.trim().replace(/\/+$/, "");
  if (set && /^https?:\/\/[^\s/]+$/.test(set)) return set;
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "").replace(/\/+$/, "")}`;
  return "http://localhost:3000";
}

// The test-site password is on: tell search engines to stay away entirely.
export const isPrivatePreview = () => Boolean(process.env.SITE_PASSWORD);

export const OG_LOCALE: Record<string, string> = { en: "en_US", ar: "ar_SA", ur: "ur_PK", hi: "hi_IN" };

// Canonical address of a page in one language, plus the same page in every language (hreflang).
// path is the part after the language, e.g. "" for the home page or "/suits/ABC-1".
export function languageLinks(locale: string, path: string) {
  const languages: Record<string, string> = {};
  for (const l of routing.locales) languages[l] = `/${l}${path}`;
  languages["x-default"] = `/${routing.defaultLocale}${path}`;
  return { canonical: `/${locale}${path}`, languages };
}

// Structured data as a <script>, safe from "</script>" inside the text.
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
