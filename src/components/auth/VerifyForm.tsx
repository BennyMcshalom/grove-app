"use client";

import { useEffect, useState, useTransition } from "react";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { FormError } from "@/components/auth/FormError";
import { Button } from "@/components/ui/Button";
import { PinInput } from "@/components/ui/PinInput";
import { abandonVerification, resendCode, verifyCode } from "@/lib/auth/actions";

// Supabase Auth codes are 6-10 digits (Figma drew 4); matches otp_length and
// otp_expiry in supabase/config.toml.
const CODE_LENGTH = 6;
const EXPIRY_SECONDS = 8 * 60;

export function VerifyForm({ email }: { email: string }) {
  const [code, setCode] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(EXPIRY_SECONDS);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [verifying, startVerify] = useTransition();
  const [resending, startResend] = useTransition();

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  const submit = (value: string) => {
    setError(undefined);
    setNotice(undefined);
    startVerify(async () => {
      // Success redirects; only failures come back.
      const result = await verifyCode(value);
      if (result?.error) {
        setError(result.error);
        setCode("");
      }
    });
  };

  const minutes = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const seconds = String(secondsLeft % 60).padStart(2, "0");
  const expired = secondsLeft <= 0;

  return (
    <AuthSplitLayout>
      <form
        className="flex flex-col gap-5 rounded-2xl bg-ivory-100 p-5 lg:p-7 shadow-[0px_0px_16px_0px_rgba(0,0,0,0.1)]"
        onSubmit={(e) => {
          e.preventDefault();
          if (code.length === CODE_LENGTH) submit(code);
        }}
      >
        <header className="flex flex-col gap-1">
          <h1 className="font-display text-2xl leading-[1.04] font-semibold sm:text-3xl lg:text-4xl xl:text-5xl text-ink-700">
            OTP Verification
          </h1>
          <p className="font-sans text-sm text-ink-400 lg:text-base">
            We&rsquo;ve sent you a {CODE_LENGTH}-digit code. Check your email and
            enter it here.
          </p>
        </header>

        <FormError message={error} />

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            {/* The design has no submit control, so a complete code submits itself. */}
            <PinInput
              length={CODE_LENGTH}
              value={code}
              onChange={(next) => {
                setCode(next);
                if (next.length === CODE_LENGTH && !verifying) submit(next);
              }}
              label="OTP code"
            />
            <p className="font-sans text-sm text-ink-300" aria-live="polite">
              {verifying
                ? "Checking your code…"
                : (notice ?? `The OTP has been sent to ${email}`)}
            </p>
          </div>

          <span
            className="w-fit rounded-xl bg-ivory-600 px-3 py-2.5 font-ui text-sm text-ink-300"
            aria-live="polite"
          >
            {expired ? "Code expired" : `Expires in ${minutes}:${seconds} mins`}
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="primary"
            size="md"
            fullWidth
            loading={resending}
            onClick={() => {
              setError(undefined);
              startResend(async () => {
                const result = await resendCode();
                if (result.error) {
                  setError(result.error);
                  return;
                }
                setCode("");
                setSecondsLeft(EXPIRY_SECONDS);
                setNotice(`A new code is on its way to ${email}`);
              });
            }}
          >
            Resend
          </Button>
          <Button
            type="submit"
            formAction={abandonVerification}
            formNoValidate
            variant="tertiary"
            size="md"
            fullWidth
          >
            Wrong email? Go back
          </Button>
        </div>
      </form>
    </AuthSplitLayout>
  );
}
