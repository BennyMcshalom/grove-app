import { NextResponse, type NextRequest } from "next/server";
import { REFERRAL_COOKIE } from "@/lib/referral";
import { requestOrigin } from "@/lib/site-url";

/**
 * Keeps the invite through sign-up (email or Google): a 30-day cookie that
 * onboarding reads and attaches to the new account (claim_referral).
 */
export async function GET(_request: NextRequest, { params }: RouteContext<"/r/[code]/accept">) {
  const { code } = await params;
  const origin = await requestOrigin();
  const response = NextResponse.redirect(`${origin}/sign-up`);
  if (/^[a-z0-9]{3,24}$/i.test(code)) {
    response.cookies.set(REFERRAL_COOKIE, code.toLowerCase(), {
      httpOnly: true,
      sameSite: "lax",
      secure: origin.startsWith("https"),
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  return response;
}
