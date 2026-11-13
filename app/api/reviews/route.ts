import { NextResponse, type NextRequest } from "next/server";
import { publishedReviews } from "@/lib/customer/reviews";

// Published reviews of one suit (public data: stars, text, first name + initial, our reply).
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code") ?? "";
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(code)) return NextResponse.json({ reviews: [] }, { status: 400 });
  const reviews = await publishedReviews(code);
  return NextResponse.json({ reviews }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
}
