import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { GATE_COOKIE, GATE_MAX_AGE, gateToken, isLocale, safeNextPath } from "@/lib/site-gate";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const localeField = form.get("locale");
  const locale = isLocale(localeField) ? localeField : routing.defaultLocale;
  const next = safeNextPath(form.get("next"), locale);
  const expected = process.env.SITE_PASSWORD;

  if (!expected) return NextResponse.redirect(new URL(next, req.url), 303);

  const given = String(form.get("password") ?? "");
  const [a, b] = await Promise.all([gateToken(given), gateToken(expected)]);

  if (a !== b) {
    await new Promise((r) => setTimeout(r, 800));
    const back = new URL(`/${locale}/unlock`, req.url);
    back.searchParams.set("error", "1");
    back.searchParams.set("next", next);
    return NextResponse.redirect(back, 303);
  }

  const res = NextResponse.redirect(new URL(next, req.url), 303);
  res.cookies.set(GATE_COOKIE, b, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: GATE_MAX_AGE,
  });
  return res;
}
