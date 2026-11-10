import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { getSessionClient } from "@/lib/supabase/server";

// The sign-in link from the email lands here. Supabase checks the link, then sends the person back
// with a one-time "code" that only works in the browser that asked for it (PKCE). We swap it for a
// session cookie and open the back office. (token_hash is accepted too, for a custom email template.)
export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const supabase = await getSessionClient();

  let ok = false;
  if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  } else if (tokenHash && type) {
    ok = !(await supabase.auth.verifyOtp({ token_hash: tokenHash, type })).error;
  }
  return NextResponse.redirect(new URL(ok ? "/admin" : "/admin/sign-in?error=link", req.url), 303);
}
