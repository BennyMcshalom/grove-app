"use server";

import { timingSafeEqual } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Team sign-in (/auth/dev-sign-in): sign in as an existing account by email,
 * no password, to look at signed-in screens.
 *
 *  - Local (`next dev`): open, no key.
 *  - Staging: only when STAGING_SIGN_IN_KEY is set there, and the key must be
 *    entered. Staging shares the live database, so without the key this would
 *    let anyone sign in as anyone.
 *  - grouv.app: always off (no key on Railway, and the host is refused).
 */
export async function teamSignInMode(): Promise<"off" | "local" | "staging"> {
  if (process.env.NODE_ENV === "development") return "local";
  const host = ((await headers()).get("host") ?? "").split(":")[0];
  if (host === "grouv.app" || host.endsWith(".grouv.app")) return "off";
  return (process.env.STAGING_SIGN_IN_KEY ?? "").length >= 12 ? "staging" : "off";
}

function keyMatches(given: string) {
  const expected = Buffer.from(process.env.STAGING_SIGN_IN_KEY ?? "");
  const actual = Buffer.from(given);
  return expected.length > 0 && actual.length === expected.length && timingSafeEqual(actual, expected);
}

export type TeamSignInState = { error?: string; email?: string } | undefined;

export async function teamSignIn(_state: TeamSignInState, formData: FormData): Promise<TeamSignInState> {
  const mode = await teamSignInMode();
  if (mode === "off") return { error: "This sign-in isn't available here." };

  const email = String(formData.get("email") ?? "").trim();
  if (mode === "staging" && !keyMatches(String(formData.get("key") ?? ""))) {
    // Slows guessing: every wrong key waits two seconds.
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return { error: "That team key isn't right.", email };
  }
  if (!email) return { error: "Enter an account email.", email };

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  const tokenHash = data?.properties?.hashed_token;
  if (error || !tokenHash) return { error: "There's no account with that email.", email };

  // Verifying the link here sets the session cookies on this site.
  const supabase = await createClient();
  const { error: verifyError } = await supabase.auth.verifyOtp({ type: "magiclink", token_hash: tokenHash });
  if (verifyError) return { error: "Couldn't sign in. Try again.", email };

  redirect("/home");
}
