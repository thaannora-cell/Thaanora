import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { routing } from "./i18n/routing";
import { GATE_COOKIE, gateToken, isLocale } from "./lib/site-gate";

const intl = createMiddleware(routing);
const NOINDEX = "noindex, nofollow";

export default async function proxy(req: NextRequest) {
  const password = process.env.SITE_PASSWORD;
  const { pathname, search } = req.nextUrl;
  const isApi = pathname.startsWith("/api/");

  if (password) {
    // The daily jobs check their own secret (CRON_SECRET), so the test-site password doesn't block them.
    const isUnlock = pathname === "/api/unlock" || pathname.startsWith("/api/cron/") || /^\/[a-z]{2}\/unlock\/?$/.test(pathname);
    const unlocked = req.cookies.get(GATE_COOKIE)?.value === (await gateToken(password));

    if (!unlocked && !isUnlock) {
      if (isApi) {
        return new NextResponse("Locked", { status: 401, headers: { "X-Robots-Tag": NOINDEX } });
      }
      const fromPath = pathname.split("/")[1];
      const fromCookie = req.cookies.get("NEXT_LOCALE")?.value;
      const locale = isLocale(fromPath) ? fromPath : isLocale(fromCookie) ? fromCookie : routing.defaultLocale;
      const url = req.nextUrl.clone();
      url.pathname = `/${locale}/unlock`;
      url.search = `?next=${encodeURIComponent(pathname + search)}`;
      const res = NextResponse.redirect(url);
      res.headers.set("X-Robots-Tag", NOINDEX);
      res.headers.set("Cache-Control", "private, no-store");
      return res;
    }
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) return admin(req);

  const res = isApi ? NextResponse.next() : intl(req);
  // Signed-in customers (My Thaanora): keep the session fresh on every page. Guests have no
  // Supabase cookie, so for them nothing extra happens.
  if (!isApi && req.cookies.getAll().some((c) => c.name.startsWith("sb-"))) await keepSignedIn(req, res);
  if (password) res.headers.set("X-Robots-Tag", NOINDEX);
  return res;
}

function sessionClient(req: NextRequest, onSet: (list: { name: string; value: string; options: CookieOptions }[]) => void) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createServerClient(url, key, {
    // Only the server reads the sign-in cookie, so page scripts can't (protects the session from XSS).
    cookieOptions: { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" },
    cookies: { getAll: () => req.cookies.getAll(), setAll: onSet },
  });
}

// Renews an expiring customer session and hands the new cookies to the browser.
async function keepSignedIn(req: NextRequest, res: NextResponse) {
  const supabase = sessionClient(req, (list) => {
    list.forEach(({ name, value }) => req.cookies.set(name, value));
    list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
  });
  await supabase?.auth.getUser();
}

// Back office: no language prefix, never indexed or cached, and the sign-in session is refreshed
// here (server components can read cookies but not write them).
async function admin(req: NextRequest) {
  let res = NextResponse.next({ request: req });
  const supabase = sessionClient(req, (list) => {
    list.forEach(({ name, value }) => req.cookies.set(name, value));
    res = NextResponse.next({ request: req });
    list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
  });
  await supabase?.auth.getUser();
  res.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  res.headers.set("Cache-Control", "private, no-store");
  return res;
}

export const config = {
  matcher: ["/((?!_next|_vercel|.*\\..*).*)"],
};
