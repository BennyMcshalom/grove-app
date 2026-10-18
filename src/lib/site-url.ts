import "server-only";
import { headers } from "next/headers";

/**
 * Hosts Grouv answers on. A request's Host / X-Forwarded-Host header is only
 * trusted if it's one of these, so a forged header can't steer a redirect or
 * an emailed link to another site. Add the dev site's host here when it exists.
 */
function allowedHosts() {
  const hosts = new Set(["grouv.app", "localhost:3000", "127.0.0.1:3000"]);
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) {
    try {
      hosts.add(new URL(configured).host);
    } catch {}
  }
  for (const extra of (process.env.ALLOWED_HOSTS ?? "").split(",")) if (extra.trim()) hosts.add(extra.trim());
  return hosts;
}

/** The public origin, for OAuth redirects and links in email: NEXT_PUBLIC_SITE_URL, else https://grouv.app. */
export async function siteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/+$/, "");
  const fromRequest = await trustedRequestOrigin();
  return fromRequest ?? "https://grouv.app";
}

/**
 * The origin this request came in on (behind Railway's proxy, the forwarded
 * host). OAuth must call back to the same site it started on, because the
 * sign-in verifier cookie only exists there. Falls back to siteUrl() for an
 * unknown host.
 */
export async function requestOrigin() {
  return (await trustedRequestOrigin()) ?? siteUrl();
}

async function trustedRequestOrigin() {
  const requestHeaders = await headers();
  const host = (requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host"))?.split(",")[0].trim().toLowerCase();
  if (!host || !allowedHosts().has(host)) return null;
  const local = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  return `${local ? "http" : "https"}://${host}`;
}
