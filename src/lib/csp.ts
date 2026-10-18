/**
 * Content-Security-Policy for every page, set by src/proxy.ts.
 *
 * Scripts: only ones carrying this request's nonce, plus whatever those load
 * ('strict-dynamic' — that's how the RevenueCat checkout brings in Stripe).
 * An injected <script> or inline handler can't run. Everything else is
 * limited to the services the app really talks to. Violations are reported
 * to /api/csp-report (they show in Railway's logs).
 */

function originOf(url: string | undefined) {
  if (!url) return null;
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

export function appCsp(nonce: string) {
  const dev = process.env.NODE_ENV === "development";
  const supabase = originOf(process.env.NEXT_PUBLIC_SUPABASE_URL) ?? "*.supabase.co";
  const livekit = originOf(process.env.LIVEKIT_URL?.replace(/^wss?:/, "https:"));

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'", ...(dev ? ["'unsafe-eval'"] : [])],
    // Inline style attributes are used throughout (and by the checkout); styles can't run code.
    "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    "font-src": ["'self'", "data:", "https://fonts.gstatic.com", "https://da08ctfrofx1b.cloudfront.net"],
    "img-src": [
      "'self'",
      "data:",
      "blob:",
      `https://${supabase}`,
      "https://lh3.googleusercontent.com",
      "https://da08ctfrofx1b.cloudfront.net",
      "https://*.revenuecat.com",
      "https://*.stripe.com",
    ],
    "media-src": ["'self'", "blob:", `https://${supabase}`],
    "connect-src": [
      "'self'",
      `https://${supabase}`,
      `wss://${supabase}`,
      ...(livekit ? [`https://${livekit}`, `wss://${livekit}`] : []),
      "https://*.livekit.cloud",
      "wss://*.livekit.cloud",
      "https://api.revenuecat.com",
      "https://*.revenuecat.com",
      "https://e.revenue.cat",
      "https://api.stripe.com",
      "https://*.stripe.com",
      "https://*.stripe.network",
      "https://api.bigdatacloud.net",
      ...(dev ? ["ws:", "http://localhost:*"] : []),
    ],
    "frame-src": ["https://js.stripe.com", "https://*.js.stripe.com", "https://hooks.stripe.com", "https://*.stripe.network"],
    "worker-src": ["'self'", "blob:"],
    // Google sign-in posts to the app, which redirects to Supabase, then Google.
    "form-action": ["'self'", `https://${supabase}`, "https://accounts.google.com"],
    "frame-ancestors": ["'none'"],
    "base-uri": ["'self'"],
    "object-src": ["'none'"],
    "manifest-src": ["'self'"],
    "report-uri": ["/api/csp-report"],
  };

  const policy = Object.entries(directives)
    .map(([name, values]) => `${name} ${values.join(" ")}`)
    .join("; ");
  return dev ? policy : `${policy}; upgrade-insecure-requests`;
}

/** The static marketing page (public/landing): its own files and Google Fonts, no scripts from anywhere else. */
export const LANDING_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self'",
  "report-uri /api/csp-report",
  "upgrade-insecure-requests",
].join("; ");
