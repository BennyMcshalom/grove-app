"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { emailSchema, newPasswordSchema } from "@/lib/auth/schemas";
import { resendSignUpCode, sendPasswordCode, startSignUp } from "@/lib/auth/codes";
import { safeNext } from "@/lib/auth/safe-next";
import { sessionNeedsTwoStep } from "@/lib/auth/two-step-check";
import { landingPath } from "@/lib/auth/viewer";
import { requestOrigin } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";
import { LIMITS, TOO_MANY, clientIp, withinLimits } from "@/lib/rate-limit";

/** Remembers which address the verify screen is confirming. */
const PENDING_EMAIL_COOKIE = "grouv_pending_email";

export type AuthFormState =
  | {
      error?: string;
      fieldErrors?: Partial<Record<"firstName" | "email" | "password" | "terms", string>>;
      values?: { firstName?: string; email?: string };
    }
  | undefined;

const SignUpSchema = z.object({
  firstName: z.string().trim().min(1, "Tell us what to call you").max(50, "Keep it under 50 characters"),
  email: emailSchema,
  password: newPasswordSchema,
  terms: z.literal("on", { error: "Agree to the Terms and Privacy Policy to continue" }),
});

const SignInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password"),
});

function firstErrors(error: z.ZodError): NonNullable<AuthFormState>["fieldErrors"] {
  const { fieldErrors } = z.flattenError(error);
  return Object.fromEntries(
    Object.entries(fieldErrors).map(([field, messages]) => [field, (messages as string[])[0]]),
  );
}

async function rememberPendingEmail(address: string) {
  (await cookies()).set(PENDING_EMAIL_COOKIE, address, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 30,
  });
}

/** The address waiting on a code, for the verify screen. */
export async function getPendingEmail() {
  return (await cookies()).get(PENDING_EMAIL_COOKIE)?.value ?? null;
}

export async function signUp(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const values = {
    firstName: String(formData.get("firstName") ?? ""),
    email: String(formData.get("email") ?? ""),
  };
  const parsed = SignUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error), values };
  if (!(await withinLimits([LIMITS.signUpIp(await clientIp()), LIMITS.codeSendEmail(parsed.data.email)]))) {
    return { error: TOO_MANY, values };
  }

  const result = await startSignUp({
    email: parsed.data.email,
    password: parsed.data.password,
    data: { first_name: parsed.data.firstName, terms_accepted: true },
  });
  if (result.weakPassword) return { fieldErrors: { password: result.weakPassword }, values };
  if (result.error) return { error: result.error, values };

  // An address that already has an account gets no code, but the screen
  // looks the same either way, so sign-up can't be used to find out who's on
  // Grouv. The code screen points to sign-in.
  await rememberPendingEmail(parsed.data.email);
  redirect("/verify");
}

export async function signIn(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const values = { email: String(formData.get("email") ?? "") };
  const parsed = SignInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error), values };
  if (!(await withinLimits([LIMITS.signInIp(await clientIp()), LIMITS.signInEmail(parsed.data.email)]))) {
    return { error: TOO_MANY, values };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error?.code === "email_not_confirmed") {
    // They signed up but never entered the code; send a fresh one.
    if (await withinLimits([LIMITS.codeSendEmail(parsed.data.email)])) await resendSignUpCode(parsed.data.email);
    await rememberPendingEmail(parsed.data.email);
    redirect("/verify");
  }

  if (error || !data.user) {
    if (error?.code === "invalid_credentials") {
      return { error: "That email and password don't match.", values };
    }
    if (error?.code === "over_request_rate_limit") {
      return { error: "Too many attempts. Wait a few minutes and try again.", values };
    }
    return { error: "We couldn't sign you in. Try again in a moment.", values };
  }

  const next = safeNext(formData.get("next"));

  // Two-step verification on: the code comes next; /two-step finishes signing in.
  if (await sessionNeedsTwoStep(supabase)) {
    redirect(next ? `/two-step?next=${encodeURIComponent(next)}` : "/two-step");
  }

  // Signing back in calls off a scheduled account deletion.
  await supabase.rpc("cancel_account_deletion");

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarded_at")
    .eq("id", data.user.id)
    .single();

  redirect(profile?.onboarded_at && next ? next : landingPath(profile));
}

export async function verifyCode(code: string): Promise<{ error?: string }> {
  const pendingEmail = await getPendingEmail();
  if (!pendingEmail) {
    return { error: "This code screen has expired. Go back and start again." };
  }
  if (!/^\d{6}$/.test(code)) {
    return { error: "Enter all 6 digits." };
  }
  if (!(await withinLimits([LIMITS.codeCheck(pendingEmail)]))) return { error: TOO_MANY };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    email: pendingEmail,
    token: code,
    type: "email",
  });

  if (error || !data.user) {
    return {
      error:
        error?.code === "otp_expired"
          ? "That code has expired or isn't right. Check it, or tap Resend for a new one."
          : "We couldn't check that code. Try again.",
    };
  }

  (await cookies()).delete(PENDING_EMAIL_COOKIE);

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarded_at")
    .eq("id", data.user.id)
    .single();

  redirect(landingPath(profile));
}

export async function resendCode(): Promise<{ error?: string }> {
  const pendingEmail = await getPendingEmail();
  if (!pendingEmail) {
    return { error: "This code screen has expired. Go back and start again." };
  }

  if (!(await withinLimits([LIMITS.codeSendIp(await clientIp()), LIMITS.codeSendEmail(pendingEmail)]))) {
    return { error: "Wait a few minutes before asking for another code." };
  }

  return resendSignUpCode(pendingEmail);
}

/**
 * "Wrong email? Go back" — forget the pending address so /verify stops
 * catching them, and hand it back to sign-up to correct.
 */
export async function abandonVerification() {
  const jar = await cookies();
  const pendingEmail = jar.get(PENDING_EMAIL_COOKIE)?.value;
  jar.delete(PENDING_EMAIL_COOKIE);
  redirect(pendingEmail ? `/sign-up?email=${encodeURIComponent(pendingEmail)}` : "/sign-up");
}

/**
 * "Forgot password?" step 1: email a 6-digit code (the recovery template).
 * Answers the same whether or not the address has an account, so the form
 * can't be used to find out who's on Grouv.
 */
export async function requestPasswordReset(email: string): Promise<{ error?: string; email?: string }> {
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (!(await withinLimits([LIMITS.codeSendIp(await clientIp()), LIMITS.codeSendEmail(parsed.data)]))) {
    return { error: "Wait a few minutes before asking for another code." };
  }

  const { error } = await sendPasswordCode(parsed.data, "recovery");
  if (error) return { error };
  return { email: parsed.data };
}

/**
 * Step 2: the code plus a new password. The password is checked first so a
 * typo in it doesn't use up the code. A good code signs them in, then the
 * new password is saved.
 */
export async function resetPassword(
  email: string,
  code: string,
  password: string,
): Promise<{ error?: string; needTwoStep?: boolean; fieldErrors?: { code?: string; password?: string } }> {
  const parsedEmail = emailSchema.safeParse(email);
  if (!parsedEmail.success) return { error: "Start again and enter your email." };
  const parsedPassword = newPasswordSchema.safeParse(password);
  if (!parsedPassword.success) return { fieldErrors: { password: parsedPassword.error.issues[0].message } };
  if (!/^\d{6}$/.test(code)) return { fieldErrors: { code: "Enter all 6 digits." } };
  if (!(await withinLimits([LIMITS.codeCheck(parsedEmail.data)]))) return { error: TOO_MANY };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({ email: parsedEmail.data, token: code, type: "recovery" });
  if (error || !data.user) {
    return {
      fieldErrors: {
        code:
          error?.code === "otp_expired"
            ? "That code is wrong or has expired. Check it, or send a new one."
            : "We couldn't check that code. Try again.",
      },
    };
  }

  // With two-step verification on, the emailed code alone isn't enough: the
  // authenticator code comes next (finishResetWithTwoStep), then the save.
  if (await sessionNeedsTwoStep(supabase)) return { needTwoStep: true };

  return saveResetPassword(supabase, data.user.id, parsedPassword.data);
}

/** Reset step 3, for accounts with two-step verification: the authenticator code, then the new password. */
export async function finishResetWithTwoStep(
  totp: string,
  password: string,
): Promise<{ error?: string; fieldErrors?: { password?: string; totp?: string } }> {
  const parsedPassword = newPasswordSchema.safeParse(password);
  if (!parsedPassword.success) return { fieldErrors: { password: parsedPassword.error.issues[0].message } };
  if (!/^\d{6}$/.test(totp)) return { fieldErrors: { totp: "Enter the 6-digit code from your authenticator app." } };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return { error: "This reset has expired. Start again from sign in." };
  if (!(await withinLimits([LIMITS.twoStep(userId)]))) return { error: TOO_MANY };

  const { data: factors } = await supabase.auth.mfa.listFactors();
  const factorId = factors?.totp.find((f) => f.status === "verified")?.id;
  if (factorId) {
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: totp });
    if (error) return { fieldErrors: { totp: "That code isn't right. Check your authenticator app and try again." } };
  }
  return saveResetPassword(supabase, userId, parsedPassword.data);
}

async function saveResetPassword(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  password: string,
): Promise<{ error?: string; fieldErrors?: { password?: string } }> {
  const { error: saveError } = await supabase.auth.updateUser({ password });
  if (saveError && saveError.code !== "same_password") {
    console.error("[auth] password reset save failed", saveError.code);
    if (saveError.code === "weak_password") return { fieldErrors: { password: saveError.message } };
    return { error: "We couldn't save your new password. Try again." };
  }

  // Like signing in, this calls off a scheduled account deletion.
  await supabase.rpc("cancel_account_deletion");
  const { data: profile } = await supabase.from("profiles").select("onboarded_at").eq("id", userId).single();
  redirect(landingPath(profile));
}

export async function signInWithGoogle() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    // Back to the site the user started on: the PKCE verifier cookie is only there.
    options: { redirectTo: `${await requestOrigin()}/auth/callback` },
  });

  if (error || !data.url) redirect("/sign-in?error=google");
  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/sign-in");
}
