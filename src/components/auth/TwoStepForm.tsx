"use client";

import { useState, useTransition } from "react";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { FormError } from "@/components/auth/FormError";
import { Button } from "@/components/ui/Button";
import { PinInput } from "@/components/ui/PinInput";
import { signOut } from "@/lib/auth/actions";
import { verifyTwoStepSignIn } from "@/lib/auth/two-step";

const CODE_LENGTH = 6;

/**
 * Sign-in step two, for accounts with two-step verification: the code from
 * the authenticator app. No Figma frame; built from OTP Verification.
 */
export function TwoStepForm({ next }: { next?: string }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string>();
  const [checking, startCheck] = useTransition();
  const [leaving, startLeaving] = useTransition();

  const submit = (value: string) => {
    setError(undefined);
    startCheck(async () => {
      // Success redirects; only failures come back.
      const result = await verifyTwoStepSignIn(value, next);
      if (result?.error) {
        setError(result.error);
        setCode("");
      }
    });
  };

  return (
    <AuthSplitLayout>
      <form
        className="flex flex-col gap-5 rounded-2xl bg-ivory-100 p-5 shadow-[0px_0px_16px_0px_rgba(0,0,0,0.1)] lg:p-7"
        onSubmit={(e) => {
          e.preventDefault();
          if (code.length === CODE_LENGTH) submit(code);
        }}
      >
        <header className="flex flex-col gap-1">
          <h1 className="font-display text-2xl leading-[1.04] font-semibold text-ink-700 sm:text-3xl lg:text-4xl xl:text-5xl">
            Two-step verification
          </h1>
          <p className="font-sans text-sm text-ink-400 lg:text-base">
            Open your authenticator app and enter the 6-digit code for Grouv.
          </p>
        </header>

        <FormError message={error} />

        <div className="flex flex-col gap-2">
          <PinInput
            length={CODE_LENGTH}
            value={code}
            onChange={(value) => {
              setCode(value);
              if (value.length === CODE_LENGTH && !checking) submit(value);
            }}
            label="Authenticator code"
          />
          <p className="font-sans text-sm text-ink-300" aria-live="polite">
            {checking ? "Checking your code…" : "The code changes every 30 seconds."}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Button type="submit" size="md" fullWidth loading={checking} disabled={code.length !== CODE_LENGTH}>
            Continue
          </Button>
          {/* A plain click, not a formAction: onSubmit's preventDefault would skip it. */}
          <Button type="button" variant="tertiary" size="md" fullWidth loading={leaving} onClick={() => startLeaving(() => signOut())}>
            Use a different account
          </Button>
        </div>

        <p className="font-sans text-xs text-ink-300">
          Lost your phone? Email{" "}
          <a href="mailto:support@grouv.app" className="font-semibold text-primary-500 hover:underline">
            support@grouv.app
          </a>{" "}
          from your account&rsquo;s email address and we&rsquo;ll help you back in after checking it&rsquo;s you.
        </p>
      </form>
    </AuthSplitLayout>
  );
}
