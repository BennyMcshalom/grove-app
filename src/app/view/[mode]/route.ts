import { NextResponse, type NextRequest } from "next/server";
import { VIEW_COOKIE } from "@/lib/experience";

/**
 * /view/classic → the legacy Home and Spaces in this browser; /view/new → the
 * new ones. For internal QA and rollback checks (docs/legacy-home-spaces.md).
 */
export async function GET(request: NextRequest, ctx: { params: Promise<{ mode: string }> }) {
  const { mode } = await ctx.params;
  const response = NextResponse.redirect(new URL("/home", request.url));
  if (mode === "classic") {
    response.cookies.set(VIEW_COOKIE, "classic", { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  } else {
    response.cookies.delete(VIEW_COOKIE);
  }
  return response;
}
