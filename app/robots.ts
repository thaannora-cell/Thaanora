import type { MetadataRoute } from "next";
import { isPrivatePreview, siteUrl } from "@/lib/seo";

// Search engines: the shop, suit pages and policies are public; accounts, back office and APIs are not.
// While the test-site password is on, nothing is indexed.
export default function robots(): MetadataRoute.Robots {
  if (isPrivatePreview()) return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/", "/en/account", "/ar/account", "/ur/account", "/hi/account", "/en/unlock", "/ar/unlock", "/ur/unlock", "/hi/unlock", "/*?bag=", "/*?track="],
      },
    ],
    sitemap: `${siteUrl()}/sitemap.xml`,
    host: siteUrl(),
  };
}
