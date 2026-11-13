import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { getSessionClient } from "@/lib/supabase/server";
import { isLocale, safeNextPath } from "@/lib/site-gate";

// The link in the sign-in email lands here (the email also has the 6-digit code, which is the main way).
// The link only works in the browser that asked for it (PKCE); then My Thaanora opens.
export async function GET(req: NextRequest, { params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : "en";
  const url = req.nextUrl;
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const supabase = await getSessionClient();

  let ok = false;
  if (code) ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  else if (tokenHash && type) ok = !(await supabase.auth.verifyOtp({ token_hash: tokenHash, type })).error;
  const next = url.searchParams.get("next");
  const after = `/${locale}/account${next ? `?next=${encodeURIComponent(safeNextPath(next, locale))}` : ""}`;
  return NextResponse.redirect(new URL(ok ? after : `/${locale}/account/sign-in?error=link`, req.url), 303);
}
