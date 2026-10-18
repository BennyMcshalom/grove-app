"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { FormError } from "@/components/auth/FormError";
import { ArrowRight } from "@/components/ui/ArrowRight";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PinInput } from "@/components/ui/PinInput";
import { requestPasswordReset, resetPassword } from "@/lib/auth/actions";

// Matches otp_length in supabase/config.toml.
const CODE_LENGTH = 6;

/**
 * "Forgot password?" from sign-in. Step one emails a 6-digit code; step two
 * takes the code and a new password, then signs them in. Uses the same
 * layout and pin slots as OTP Verification.
 */
export function ForgotPasswordForm({ initialEmail }: { initialEmail?: string }) {
  const [email, setEmail] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string>();
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; code?: string; password?: string }>({});
  const [notice, setNotice] = useState<string>();
  const [sending, startSend] = useTransition();
  const [saving, startSave] = useTransition();

  const send = (address: string) => {
    setError(undefined);
    setFieldErrors({});
    setNotice(undefined);
    startSend(async () => {
      const result = await requestPasswordReset(address);
      if (result.error) {
        if (email) setError(result.error);
        else setFieldErrors({ email: result.error });
        return;
      }
      if (email) setNotice(`A new code is on its way to ${result.email}`);
      setEmail(result.email ?? address);
      setCode("");
    });
  };

  return (
    <AuthSplitLayout>
      {email === null ? (
        <form
          className="flex flex-col gap-5 lg:gap-6"
          onSubmit={(e) => {
            e.preventDefault();
            send(String(new FormData(e.currentTarget).get("email") ?? ""));
          }}
        >
          <header className="flex flex-col gap-2">
            <h1 className="font-display text-2xl leading-[1.04] font-semibold text-ink-700 sm:text-3xl lg:text-4xl xl:text-5xl">
              Reset your password
            </h1>
            <p className="font-sans text-sm text-ink-300 lg:text-base">
              Enter the email you signed up with and we&rsquo;ll send you a {CODE_LENGTH}-digit code.
            </p>
          </header>

          <FormError message={error} />

          <Input
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="johndoe@email.com"
            defaultValue={initialEmail}
            error={fieldErrors.email}
            required
          />

          <Button type="submit" size="md" fullWidth iconRight={<ArrowRight />} loading={sending}>
            Send code
          </Button>

          <p className="text-center font-sans text-sm text-ink-300">
            Remembered it?{" "}
            <Link href="/sign-in" className="font-semibold text-primary-500 hover:underline">
              Back to sign in
            </Link>
          </p>
        </form>
      ) : (
        <form
          className="flex flex-col gap-5 lg:gap-6"
          onSubmit={(e) => {
            e.preventDefault();
            const password = String(new FormData(e.currentTarget).get("password") ?? "");
            setError(undefined);
            setFieldErrors({});
            startSave(async () => {
              // Success signs them in and redirects; only failures come back.
              const result = await resetPassword(email, code, password);
              if (result?.error) setError(result.error);
              if (result?.fieldErrors) {
                setFieldErrors(result.fieldErrors);
                if (result.fieldErrors.code) setCode("");
              }
            });
          }}
        >
          <header className="flex flex-col gap-2">
            <h1 className="font-display text-2xl leading-[1.04] font-semibold text-ink-700 sm:text-3xl lg:text-4xl xl:text-5xl">
              Choose a new password
            </h1>
            <p className="font-sans text-sm text-ink-300 lg:text-base">
              If <strong className="text-ink-500">{email}</strong> has a Grouv account, we&rsquo;ve emailed it a{" "}
              {CODE_LENGTH}-digit code. It expires in 8 minutes.
            </p>
          </header>

          <FormError message={error} />

          <div className="flex flex-col gap-2">
            <PinInput length={CODE_LENGTH} value={code} onChange={setCode} label="Code from the email" />
            <p className={`font-sans text-sm ${fieldErrors.code ? "text-destructive-60" : "text-ink-300"}`} aria-live="polite">
              {fieldErrors.code ?? notice ?? "Check your inbox, and your spam folder."}
            </p>
          </div>

          <Input
            label="New password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters, a letter and a number"
            error={fieldErrors.password}
            required
          />

          <div className="flex flex-col gap-2">
            <Button type="submit" size="md" fullWidth iconRight={<ArrowRight />} loading={saving} disabled={code.length !== CODE_LENGTH}>
              Save and sign in
            </Button>
            <Button type="button" variant="tertiary" size="md" fullWidth loading={sending} onClick={() => send(email)}>
              Send a new code
            </Button>
            <Button
              type="button"
              variant="tertiary"
              size="md"
              fullWidth
              onClick={() => {
                setEmail(null);
                setError(undefined);
                setFieldErrors({});
                setNotice(undefined);
              }}
            >
              Use a different email
            </Button>
          </div>
        </form>
      )}
    </AuthSplitLayout>
  );
}
