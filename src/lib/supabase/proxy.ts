import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { sessionNeedsTwoStep } from "@/lib/auth/two-step-check";
import type { Database } from "./database.types";
import { supabasePublishableKey, supabaseUrl } from "./env";

/**
 * Refreshes the Supabase session for this request and reports who is signed
 * in. Returns the response carrying any refreshed auth cookies; callers that
 * redirect must copy those cookies across (see `redirectWithSession`).
 */
export async function updateSession(request: NextRequest, extraRequestHeaders: Record<string, string> = {}) {
  // Passes the request on with any extra headers (the CSP nonce) and its
  // current cookies (request.cookies.set below writes into request.headers).
  const next = () => {
    if (!Object.keys(extraRequestHeaders).length) return NextResponse.next({ request });
    const headers = new Headers(request.headers);
    for (const [name, value] of Object.entries(extraRequestHeaders)) headers.set(name, value);
    return NextResponse.next({ request: { headers } });
  };
  let response = next();

  const supabase = createServerClient<Database>(supabaseUrl(), supabasePublishableKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = next();
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        // No-store headers so a CDN never serves one user's session to another.
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // Keep this call immediately after creating the client: the token refresh has
  // to land before anything reads the session.
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub ?? null;

  return { response, userId, needsTwoStep: userId ? await sessionNeedsTwoStep(supabase) : false };
}

export function redirectWithSession(
  request: NextRequest,
  sessionResponse: NextResponse,
  pathname: string,
  searchParams?: Record<string, string>,
) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = searchParams ? new URLSearchParams(searchParams).toString() : "";

  const redirect = NextResponse.redirect(url);
  sessionResponse.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  sessionResponse.headers.forEach((value, key) => {
    // Not cookies (copied above) and not Next's internal x-middleware-* signals.
    if (key.toLowerCase() !== "set-cookie" && !key.toLowerCase().startsWith("x-middleware-")) {
      redirect.headers.set(key, value);
    }
  });
  return redirect;
}
