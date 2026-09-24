"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { emailSchema, newPasswordSchema } from "@/lib/auth/schemas";
import { landingPath } from "@/lib/auth/viewer";
import { requestOrigin, siteUrl } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";

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

/** Only same-site paths, so `?next=` can't bounce users off-site. */
function safeNext(value: FormDataEntryValue | null) {
  return typeof value === "string" && /^\/(?![/\\])/.test(value) ? value : null;
}

export async function signUp(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const values = {
    firstName: String(formData.get("firstName") ?? ""),
    email: String(formData.get("email") ?? ""),
  };
  const parsed = SignUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error), values };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { first_name: parsed.data.firstName, terms_accepted: true },
      emailRedirectTo: `${await siteUrl()}/auth/callback`,
    },
  });

  if (error) {
    if (error.code === "weak_password") return { fieldErrors: { password: error.message }, values };
    if (error.code === "over_email_send_rate_limit") {
      return { error: "Too many codes sent. Wait a minute and try again.", values };
    }
    return { error: "We couldn't create your account. Try again in a moment.", values };
  }

  // With email confirmation on, Supabase answers an existing address with a
  // user that has no identities, and sends nothing.
  if (data.user && data.user.identities?.length === 0) {
    return { fieldErrors: { email: "An account already uses this email. Sign in instead." }, values };
  }

  await rememberPendingEmail(parsed.data.email);
  redirect("/verify");
}

export async function signIn(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const values = { email: String(formData.get("email") ?? "") };
  const parsed = SignInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error), values };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error?.code === "email_not_confirmed") {
    // They signed up but never entered the code; send a fresh one.
    await supabase.auth.resend({ type: "signup", email: parsed.data.email });
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarded_at")
    .eq("id", data.user.id)
    .single();

  const next = safeNext(formData.get("next"));
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

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({ type: "signup", email: pendingEmail });

  if (error) {
    return {
      error:
        error.code === "over_email_send_rate_limit"
          ? "Wait a minute before asking for another code."
          : "We couldn't send a new code. Try again shortly.",
    };
  }
  return {};
}

/** "Wrong email? Go back" — forget the pending address. */
export async function abandonVerification(formData: FormData) {
  (await cookies()).delete(PENDING_EMAIL_COOKIE);
  redirect(formData.get("from") === "sign-in" ? "/sign-in" : "/sign-up");
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
