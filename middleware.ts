import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { GATE_COOKIE, gateToken, isLocale } from "./lib/site-gate";

const intl = createMiddleware(routing);
const NOINDEX = "noindex, nofollow";

export default async function middleware(req: NextRequest) {
  const password = process.env.SITE_PASSWORD;
  const { pathname, search } = req.nextUrl;
  const isApi = pathname.startsWith("/api/");

  if (password) {
    const isUnlock = pathname === "/api/unlock" || /^\/[a-z]{2}\/unlock\/?$/.test(pathname);
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

  const res = isApi ? NextResponse.next() : intl(req);
  if (password) res.headers.set("X-Robots-Tag", NOINDEX);
  return res;
}

export const config = {
  matcher: ["/((?!_next|_vercel|.*\\..*).*)"],
};
