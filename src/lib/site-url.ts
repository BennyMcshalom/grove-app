import "server-only";
import { headers } from "next/headers";

/**
 * The public origin, for OAuth redirects and links in email. Prefers
 * NEXT_PUBLIC_SITE_URL; falls back to the forwarded host Railway's proxy sets.
 */
export async function siteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/+$/, "");

  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  return `${protocol}://${host}`;
}
