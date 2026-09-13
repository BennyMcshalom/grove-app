import type { NextRequest } from "next/server";
import { redirectWithSession, updateSession } from "@/lib/supabase/proxy";

/** Pages a signed-out visitor may open. Everything else needs a session. */
const PUBLIC_PATHS = new Set(["/", "/terms", "/privacy", "/verify", "/sign-in", "/sign-up"]);
const PUBLIC_PREFIXES = ["/auth/", "/api/health", "/api/cron/", "/api/stripe/webhook", "/api/livekit/webhook"];

/** Signed-in users skip these and go straight into the app. */
const AUTH_PAGES = new Set(["/sign-in", "/sign-up"]);

/**
 * Keeps the Supabase session fresh and does the optimistic redirects. It only
 * reads the session cookie; the real checks live next to the data (RLS and the
 * `getViewer()` guards), so a matcher change here can't open anything up.
 */
export async function proxy(request: NextRequest) {
  const { response, userId } = await updateSession(request);
  const { pathname, search } = request.nextUrl;

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
