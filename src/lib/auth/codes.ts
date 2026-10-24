import "server-only";
import { sendEmail } from "@/lib/email/send";
import { authCodeEmail, type AuthCodePurpose } from "@/lib/email/templates";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Sign-up and password codes, sent by the app instead of by Supabase Auth.
 *
 * Supabase Auth's own mailer (its SMTP settings) failed every send on
 * 2026-10-24 while the app's Resend key kept working, so nobody could sign up.
 * Supabase still makes and checks the codes: generateLink creates the code
 * without emailing it, and verifyOtp checks it as before. Only the delivery
 * moved here, through the same sender as every other Grouv email.
 */

type CodeResult = { error?: string };

const SEND_FAILED = "We couldn't email your code. Try again in a moment.";

async function deliver(to: string, code: string | undefined, purpose: AuthCodePurpose): Promise<CodeResult> {
  if (!code) return { error: SEND_FAILED };
  try {
    const { sent } = await sendEmail(authCodeEmail({ to, code, purpose }));
    return sent ? {} : { error: SEND_FAILED };
  } catch (e) {
    console.error("[auth-codes] sending failed", purpose, e);
    return { error: SEND_FAILED };
  }
}

/**
 * New account (or another try at one that was never confirmed): creates it
 * unconfirmed and emails the code. An address that already has a confirmed
 * account gets nothing and the caller carries on as normal, so sign-up can't
 * be used to find out who's on Grouv.
 */
export async function startSignUp(input: {
  email: string;
  password: string;
  data: Record<string, unknown>;
}): Promise<CodeResult & { weakPassword?: string }> {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "signup",
    email: input.email,
    password: input.password,
    options: { data: input.data },
  });
  if (error?.code === "email_exists") return {};
  if (error?.code === "weak_password") return { weakPassword: error.message };
  if (error || !data.user) {
    console.error("[auth-codes] generateLink(signup) failed", error?.code, error?.message);
    return { error: "We couldn't create your account. Try again in a moment." };
  }

  // Trying again before confirming: the account already existed, so make it
  // carry this attempt's password and name.
  if (!data.user.email_confirmed_at) {
    const { error: updateError } = await admin.auth.admin.updateUserById(data.user.id, {
      password: input.password,
      user_metadata: input.data,
    });
    if (updateError) console.error("[auth-codes] updating an unconfirmed sign-up failed", updateError.code);
  }

  return deliver(input.email, data.properties.email_otp, "signup");
}

/**
 * "Resend" on the code screen, and signing in before confirming. A new code
 * replaces the old one; for an unconfirmed account, the magic-link code
 * confirms it just like the sign-up code (verifyOtp type "email").
 */
export async function resendSignUpCode(email: string): Promise<CodeResult> {
  const { data, error } = await createAdminClient().auth.admin.generateLink({ type: "magiclink", email });
  if (error || !data.user) {
    console.error("[auth-codes] generateLink(resend) failed", error?.code, error?.message);
    return { error: "We couldn't send a new code. Try again shortly." };
  }
  // Already confirmed: this screen only confirms new accounts, so send nothing
  // (and give nothing away).
  if (data.user.email_confirmed_at) return {};
  return deliver(email, data.properties.email_otp, "signup");
}

/**
 * A password code, checked later with verifyOtp({ type: "recovery" }). An
 * address with no account gets nothing, and the caller answers the same.
 */
export async function sendPasswordCode(email: string, purpose: "recovery" | "password_change"): Promise<CodeResult> {
  const { data, error } = await createAdminClient().auth.admin.generateLink({ type: "recovery", email });
  if (error?.code === "user_not_found") return {};
  if (error || !data.user) {
    console.error("[auth-codes] generateLink(recovery) failed", error?.code, error?.message);
    return { error: "We couldn't send a code. Try again shortly." };
  }
  return deliver(email, data.properties.email_otp, purpose);
}
