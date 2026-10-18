import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * The app's own rate limits, counted in Postgres (public.rate_limit_hit,
 * service role only). Needed because Supabase Auth sees every server-side
 * request coming from the app's single address, so its per-IP limits can't
 * tell one person from another.
 *
 * Keys are hashed, so no email address or IP is stored in the clear.
 */

/** The visitor's address as Railway's edge saw it (it overwrites X-Real-IP). */
export async function clientIp() {
  const h = await headers();
  return (
    h.get("x-real-ip")?.trim() ||
    // Railway appends the address it saw; the left end could be made up by the client.
    h.get("x-forwarded-for")?.split(",").pop()?.trim() ||
    "unknown"
  );
}

const hash = (value: string) => createHash("sha256").update(value).digest("base64url").slice(0, 32);

/**
 * Counts one attempt against each limit and says whether all of them still
 * allow it. Fails open (allows) if the counter can't be reached, so a database
 * hiccup never locks everyone out; Supabase's own limits still apply then.
 */
export async function withinLimits(limits: { key: string; max: number; perSeconds: number }[]) {
  const admin = createAdminClient();
  // In parallel: each is a round trip to the database.
  const results = await Promise.all(
    limits.map((limit) =>
      admin.rpc("rate_limit_hit", { p_key: hash(limit.key), p_max: limit.max, p_window_seconds: limit.perSeconds }),
    ),
  );
  for (const { data, error } of results) {
    if (error) {
      console.error("[rate-limit] counter unavailable", error.message);
      return true;
    }
    if (data === false) return false;
  }
  return true;
}

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Named limits so each action states its intent in one line. */
export const LIMITS = {
  signInIp: (ip: string) => ({ key: `sign-in:ip:${ip}`, max: 30, perSeconds: 15 * MINUTE }),
  signInEmail: (email: string) => ({ key: `sign-in:email:${email.toLowerCase()}`, max: 10, perSeconds: 15 * MINUTE }),
  signUpIp: (ip: string) => ({ key: `sign-up:ip:${ip}`, max: 10, perSeconds: HOUR }),
  codeCheck: (email: string) => ({ key: `code:email:${email.toLowerCase()}`, max: 10, perSeconds: 15 * MINUTE }),
  codeSendEmail: (email: string) => ({ key: `code-send:email:${email.toLowerCase()}`, max: 5, perSeconds: HOUR }),
  codeSendIp: (ip: string) => ({ key: `code-send:ip:${ip}`, max: 20, perSeconds: HOUR }),
  twoStep: (userId: string) => ({ key: `two-step:${userId}`, max: 10, perSeconds: 15 * MINUTE }),
  passwordChange: (userId: string) => ({ key: `password:${userId}`, max: 10, perSeconds: HOUR }),
  geocode: (userId: string) => ({ key: `geocode:${userId}`, max: 30, perSeconds: HOUR }),
  billing: (userId: string) => ({ key: `billing:${userId}`, max: 12, perSeconds: HOUR }),
  supportEmail: (userId: string, kind: string) => ({ key: `support:${kind}:${userId}`, max: 3, perSeconds: DAY }),
} as const;

export const TOO_MANY = "Too many attempts. Wait a few minutes and try again.";
