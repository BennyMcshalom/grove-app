import { NextResponse, type NextRequest } from "next/server";
import { INVITE_COOKIE } from "@/lib/invites";

/**
 * "Join Grouv to accept" on /i/<token>: remember the invitation through
 * sign-up (and onboarding), then go to sign-up or sign-in. The app shell
 * brings the card back once they're in (ChapterInviteReturn).
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const url = request.nextUrl.clone();
  url.search = "";

  if (!/^[0-9a-f]{20}$/.test(token)) {
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  const signIn = request.nextUrl.searchParams.get("to") === "sign-in";
  url.pathname = signIn ? "/sign-in" : "/sign-up";
  if (signIn) url.searchParams.set("next", `/spaces?invite=${token}`);

  const response = NextResponse.redirect(url);
  response.cookies.set(INVITE_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
