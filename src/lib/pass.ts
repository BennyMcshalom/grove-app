import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Server-side Season Pass gate for actions behind the pass (new Bonds, Bond
 * Log, Life Wrapped, group creation…). The database stays the real check
 * (`private.has_pass` in RLS and functions); this gives the action a clear
 * answer to return so the client can open the paywall:
 *
 *   const locked = await requirePass();
 *   if (locked) return locked; // { error, paywall: true } → usePaywall()(reason)
 */
export const PASS_REQUIRED = {
  error: "This is part of Season Pass.",
  paywall: true,
} as const;

/** The signed-in member has Season Pass (trial, plan or bonus month) right now. */
export async function viewerHasPass(): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("has_pass");
  if (error) {
    console.error("[pass] has_pass failed", error);
    return false;
  }
  return data === true;
}

/** Null when they have the pass; otherwise the result to return. */
export async function requirePass(): Promise<typeof PASS_REQUIRED | null> {
  return (await viewerHasPass()) ? null : PASS_REQUIRED;
}

/** Request time for server pages (kept out of render bodies for purity lint). */
export function requestTime() {
  return Date.now();
}
