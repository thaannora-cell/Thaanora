import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { getPublicClient } from "@/lib/supabase/public";
import { POLICIES } from "@/lib/policies";
import { isPrivatePreview, siteUrl } from "@/lib/seo";

export const revalidate = 3600; // new suits appear within the hour

// Every public page in every language, each listing its other-language versions (hreflang).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (isPrivatePreview()) return [];
  const base = siteUrl();
  const entry = (path: string, opts: { lastModified?: string; priority: number; changeFrequency: "daily" | "weekly" | "monthly" }) =>
    routing.locales.map((locale) => ({
      url: `${base}/${locale}${path}`,
      lastModified: opts.lastModified,
      changeFrequency: opts.changeFrequency,
      priority: opts.priority,
      alternates: { languages: Object.fromEntries(routing.locales.map((l) => [l, `${base}/${l}${path}`])) },
    }));

  const db = getPublicClient();
  const { data } = db ? await db.from("products").select("code").eq("visible", true).order("sort_order") : { data: [] };
  return [
    ...entry("", { priority: 1, changeFrequency: "daily" }),
    ...(data ?? []).flatMap((p) => entry(`/suits/${encodeURIComponent(p.code)}`, { priority: 0.8, changeFrequency: "weekly" })),
    ...POLICIES.flatMap((slug) => entry(`/policies/${slug}`, { priority: 0.3, changeFrequency: "monthly" })),
  ];
}
