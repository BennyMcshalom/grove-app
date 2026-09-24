import { NextResponse, type NextRequest } from "next/server";
import { redirectWithSession, updateSession } from "@/lib/supabase/proxy";

/** Pages a signed-out visitor may open. Everything else needs a session. */
const PUBLIC_PATHS = new Set(["/", "/terms", "/privacy", "/verify", "/sign-in", "/sign-up"]);
const PUBLIC_PREFIXES = ["/auth/", "/api/health", "/api/cron/", "/api/revenuecat/webhook", "/api/livekit/webhook"];

/** Signed-in users skip these and go straight into the app. */
const AUTH_PAGES = new Set(["/sign-in", "/sign-up"]);

/**
 * Keeps the Supabase session fresh and does the optimistic redirects. It only
 * reads the session cookie; the real checks live next to the data (RLS and the
 * `getViewer()` guards), so a matcher change here can't open anything up.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search, searchParams } = request.nextUrl;

  // When Supabase can't use the callback we asked for, it falls back to the
  // site root with the sign-in code (or an error) attached. Finish the
  // sign-in instead of showing the landing page — that's what made Google
  // sign-up need a second try.
  if (pathname === "/" && (searchParams.has("code") || searchParams.has("error_description"))) {
    const url = request.nextUrl.clone();
    url.pathname = searchParams.has("code") ? "/auth/callback" : "/sign-in";
    url.search = searchParams.has("code") ? `?code=${encodeURIComponent(searchParams.get("code")!)}` : "?error=google";
    return NextResponse.redirect(url);
  }

  const { response, userId } = await updateSession(request);

  const isPublic =
    PUBLIC_PATHS.has(pathname) || PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (!userId && !isPublic) {
    return redirectWithSession(request, response, "/sign-in", { next: pathname + search });
  }

  if (userId && AUTH_PAGES.has(pathname)) {
    return redirectWithSession(request, response, "/home");
  }

  return response;
}

export const config = {
  matcher: [
    // Skip Next internals and static files from /public.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp4|woff2?)$).*)",
  ],
};
