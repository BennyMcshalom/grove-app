"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { Button } from "@/components/ui/Button";
import { PinInput } from "@/components/ui/PinInput";

const CODE_LENGTH = 4;
const EXPIRY_SECONDS = 8 * 60;

/** OTP Verification — Figma 127:21282. No mobile frame exists; this reflows. */
export default function VerifyPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(EXPIRY_SECONDS);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  // The design has no submit control, so a complete code advances on its own.
  useEffect(() => {
    if (code.length === CODE_LENGTH) {
      router.push("/onboarding/chapters");
    }
  }, [code, router]);

  const minutes = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const seconds = String(secondsLeft % 60).padStart(2, "0");
  const expired = secondsLeft <= 0;

  return (
    <AuthSplitLayout>
      <form
        className="flex flex-col gap-5 rounded-2xl bg-ivory-100 p-5 lg:p-7 shadow-[0px_0px_16px_0px_rgba(0,0,0,0.1)]"
        onSubmit={(e) => {
          e.preventDefault();
          router.push("/onboarding/chapters");
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

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <PinInput
              length={CODE_LENGTH}
              value={code}
              onChange={setCode}
              label="OTP code"
            />
            <p className="font-sans text-sm text-ink-300">
              The OTP has been sent to johndoe@gmail.com
            </p>
          </div>

          <span
            className="w-fit rounded-xl bg-ivory-600 px-3 py-2.5 font-ui text-sm text-ink-300"
            aria-live="polite"
          >
            {expired ? "Code expired" : `Expires in ${minutes}:${seconds} mins`}
          </span>
        </div>

        {/* Figma shows no submit button — entering the last digit advances. */}
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="primary"
            size="md"
            fullWidth
            onClick={() => {
              setCode("");
              setSecondsLeft(EXPIRY_SECONDS);
            }}
          >
            Resend
          </Button>
          <Button
            type="button"
            variant="tertiary"
            size="md"
            fullWidth
            onClick={() => router.push("/sign-up")}
          >
            Wrong email? Go back
          </Button>
        </div>
      </form>
    </AuthSplitLayout>
  );
}
