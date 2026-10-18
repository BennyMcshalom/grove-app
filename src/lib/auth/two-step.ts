"use server";

import { redirect } from "next/navigation";
import { safeNext } from "@/lib/auth/safe-next";
import { landingPath, requireOnboardedViewer } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";
import { LIMITS, TOO_MANY, withinLimits } from "@/lib/rate-limit";

/**
 * Two-step verification: an authenticator-app code (TOTP) after the password
 * or Google. Optional, turned on in Settings → Security.
 *
 * Enforced in three places, so skipping the app's screens doesn't help:
 * the proxy keeps aal1 sessions on /two-step, getViewer() refuses them, and
 * the database refuses aal1 tokens for anyone who has a verified factor
 * (migration 20261018100000_two_step_enforcement).
 */

type Supabase = Awaited<ReturnType<typeof createClient>>;

const SIX_DIGITS = /^\d{6}$/;

async function verifiedFactorId(supabase: Supabase) {
  const { data } = await supabase.auth.mfa.listFactors();
  return data?.totp.find((f) => f.status === "verified")?.id ?? null;
}

async function checkCode(supabase: Supabase, factorId: string, code: string) {
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
  if (!error) return null;
  if (error.code === "mfa_verification_failed" || error.code === "mfa_challenge_expired") {
    return "That code isn't right. Check your authenticator app and try again.";
  }
  if (error.code === "over_request_rate_limit" || error.status === 429) {
    return "Too many tries. Wait a minute and try again.";
  }
  return "We couldn't check that code. Try again.";
}

/** Where a fully signed-in user goes next; also calls off a scheduled deletion, like signing in does. */
async function finishSignIn(supabase: Supabase, next: string | null): Promise<never> {
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/sign-in");
  await supabase.rpc("cancel_account_deletion");
  const { data: profile } = await supabase.from("profiles").select("onboarded_at").eq("id", userId).single();
  redirect(profile?.onboarded_at && next ? next : landingPath(profile));
}

// ---------------------------------------------------------------------------
// Signing in
// ---------------------------------------------------------------------------

/** The /two-step screen: the code from the authenticator app. */
export async function verifyTwoStepSignIn(code: string, next?: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const factorId = await verifiedFactorId(supabase);
  if (!factorId) redirect("/sign-in");
  if (!SIX_DIGITS.test(code)) return { error: "Enter the 6-digit code from your authenticator app." };
  const { data: claims } = await supabase.auth.getClaims();
  if (!(await withinLimits([LIMITS.twoStep(claims?.claims?.sub ?? "unknown")]))) return { error: TOO_MANY };

  const error = await checkCode(supabase, factorId, code);
  if (error) return { error };
  return finishSignIn(supabase, safeNext(next));
}

// ---------------------------------------------------------------------------
// Settings → Security
// ---------------------------------------------------------------------------

export async function twoStepEnabled() {
  await requireOnboardedViewer();
  return Boolean(await verifiedFactorId(await createClient()));
}

/** Step 1 of turning it on: a QR code and the secret to type in by hand. */
export async function startTwoStepSetup(): Promise<
  { factorId: string; qrCode: string; secret: string } | { error: string }
> {
  await requireOnboardedViewer();
  const supabase = await createClient();
  if (await verifiedFactorId(supabase)) return { error: "Two-step verification is already on." };

  // Clear any half-finished setup first; Supabase refuses a second unverified factor.
  const { data: factors } = await supabase.auth.mfa.listFactors();
  for (const factor of factors?.all ?? []) {
    if (factor.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: factor.id });
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    issuer: "Grouv",
    friendlyName: `Authenticator ${new Date().toISOString().slice(0, 10)}`,
  });
  if (error || !data) {
    console.error("[two-step] enroll failed", error?.code);
    return { error: "We couldn't start two-step verification. Try again." };
  }
  return { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret };
}

/** Step 2: the first code from the app proves it's set up. */
export async function confirmTwoStepSetup(factorId: string, code: string): Promise<{ error?: string }> {
  const viewer = await requireOnboardedViewer();
  if (!SIX_DIGITS.test(code)) return { error: "Enter the 6-digit code from your authenticator app." };
  if (!(await withinLimits([LIMITS.twoStep(viewer.userId)]))) return { error: TOO_MANY };
  const supabase = await createClient();
  const error = await checkCode(supabase, factorId, code);
  return error ? { error } : {};
}

/** Turning it off needs a current code, so an unlocked phone or laptop isn't enough. */
export async function turnOffTwoStep(code: string): Promise<{ error?: string }> {
  const viewer = await requireOnboardedViewer();
  if (!SIX_DIGITS.test(code)) return { error: "Enter the 6-digit code from your authenticator app." };
  if (!(await withinLimits([LIMITS.twoStep(viewer.userId)]))) return { error: TOO_MANY };
  const supabase = await createClient();
  const factorId = await verifiedFactorId(supabase);
  if (!factorId) return {};

  const error = await checkCode(supabase, factorId, code);
  if (error) return { error };

  const { data: factors } = await supabase.auth.mfa.listFactors();
  for (const factor of factors?.all ?? []) {
    const { error: removeError } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
    if (removeError) {
      console.error("[two-step] unenroll failed", removeError.code);
      return { error: "We couldn't turn it off. Try again." };
    }
  }
  return {};
}

/** Signs out every other browser and phone; this one stays signed in. */
export async function signOutOtherDevices(): Promise<{ error?: string }> {
  await requireOnboardedViewer();
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut({ scope: "others" });
  return error ? { error: "We couldn't sign out your other devices. Try again." } : {};
}
