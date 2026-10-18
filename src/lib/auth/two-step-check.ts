import "server-only";
import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/**
 * Signed in, has two-step verification on, but hasn't entered the code this
 * session (assurance level aal1 where aal2 is possible). Reads the session
 * cookie only; no network call.
 */
export async function sessionNeedsTwoStep(supabase: Pick<Supabase, "auth">) {
  // This reads the factor list from the session cookie, and supabase-js warns
  // on every such read (it runs on each request). That's fine here: the token
  // itself is verified by getClaims() first, and the database enforces two-step
  // for real (migration 20261018100000), so this check only steers the UI.
  (supabase.auth as unknown as { suppressGetSessionWarning: boolean }).suppressGetSessionWarning = true;
  const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  return data?.nextLevel === "aal2" && data.currentLevel !== "aal2";
}
