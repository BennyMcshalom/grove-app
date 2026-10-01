import "server-only";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

/** Set by /r/[code]/accept; read once when onboarding finishes. */
export const REFERRAL_COOKIE = "grouv_ref";

/**
 * Attaches the invite this browser arrived with to the signed-in account.
 * Only works before onboarding completes (the database checks), so call it
 * just before complete_onboarding. Never fails the caller.
 */
export async function claimReferralFromCookie() {
  const jar = await cookies();
  const code = jar.get(REFERRAL_COOKIE)?.value;
  if (!code) return;
  const supabase = await createClient();
  const { error } = await supabase.rpc("claim_referral", { p_code: code });
  if (error) console.warn("[referral] claim failed", error);
  jar.delete(REFERRAL_COOKIE);
}
