"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Checkbox } from "@/components/ui/Checkbox";
import { GoogleButton, OrDivider } from "@/components/ui/GoogleButton";
import { ArrowRight } from "@/components/ui/ArrowRight";

/** Sign Up — Figma 11:16808 (desktop) / 585:19657 (mobile). */
export default function SignUpPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);

  // The three rules Figma shows as checkbox rows under the password field.
  const rules = [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "At least one letter", met: /[a-zA-Z]/.test(password) },
    { label: "At least one number", met: /\d/.test(password) },
  ];
  const passwordValid = rules.every((r) => r.met);

  return (
    <AuthSplitLayout>
      <form
        className="flex flex-col gap-5 lg:gap-6"
        onSubmit={(e) => {
          e.preventDefault();
          router.push("/verify");
        }}
      >
        <header className="flex flex-col gap-2">
          <h1 className="font-display text-2xl leading-[1.04] font-semibold sm:text-3xl lg:text-4xl xl:text-5xl text-[#1F2937] ">
            Begin your chapter
          </h1>
          <p className="font-sans text-sm text-ink-300 lg:text-base">
            Already have an account?{" "}
            <Link
              href="/sign-in"
              className="font-semibold text-primary-500 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </header>

        <div className="flex flex-col gap-4 lg:gap-5">
          <div className="flex flex-col gap-4">
            <Input
              label="First name"
              name="firstName"
              autoComplete="given-name"
              placeholder="What do we call you?"
              hint="This is how your circle will know you"
              required
            />

            <Input
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="johndoe@email.com"
              required
            />

            <div className="flex flex-col gap-3">
              <Input
                label="Password"
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder="Create password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <ul className="flex flex-col gap-3">
                {rules.map((rule) => (
                  <li key={rule.label}>
                    <Checkbox
                      readOnlyMarker
                      checked={rule.met}
                      label={rule.label}
                    />
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <Checkbox
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            label={
              <>
                I agree to Grouv&rsquo;s{" "}
                <Link href="/terms" className="underline">
                  Terms
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="underline">
                  Privacy Policy
                </Link>
                .
              </>
            }
          />

          <Button
            type="submit"
            size="md"
            fullWidth
            iconRight={<ArrowRight />}
            disabled={!agreed || !passwordValid}
          >
            Begin your chapter
          </Button>
        </div>

        <OrDivider />
        <GoogleButton />
      </form>
    </AuthSplitLayout>
  );
}
