"use client";

import Link from "next/link";
import { use, useActionState, useState } from "react";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { FormError } from "@/components/auth/FormError";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { GoogleButton, OrDivider } from "@/components/ui/GoogleButton";
import { cn } from "@/lib/cn";
import { signUp } from "@/lib/auth/actions";

/**
 * Sign up, lean version (2026-11-26): Google first, then three fields.
 * "Begin your chapter" is retired now that chapters are Spaces. Agreeing to
 * the Terms is stated beside the button (the action still records
 * terms_accepted), instead of a separate checkbox.
 */
export default function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const [state, formAction, pending] = useActionState(signUp, undefined);
  // "Wrong email? Go back" on the code screen returns here with the address.
  const { email: returnedEmail } = use(searchParams);
  const [password, setPassword] = useState("");

  const rules = [
    { label: "8+ characters", met: password.length >= 8 },
    { label: "a letter", met: /[a-zA-Z]/.test(password) },
    { label: "a number", met: /\d/.test(password) },
  ];
  const passwordValid = rules.every((r) => r.met);

  return (
    <AuthSplitLayout>
      <form action={formAction} className="flex flex-col gap-6">
        <header className="flex flex-col gap-1.5">
          <h1 className="font-display text-2xl leading-tight font-semibold text-ink-800 sm:text-3xl">
            Create your account
          </h1>
          <p className="font-sans text-sm text-ink-400">
            Already on Grouv?{" "}
            <Link href="/sign-in" className="font-semibold text-primary-500 hover:underline">
              Sign in
            </Link>
          </p>
        </header>

        <GoogleButton />
        <OrDivider />

        <FormError message={state?.error ?? state?.fieldErrors?.terms} />

        <div className="flex flex-col gap-4">
          <Input
            label="First name"
            name="firstName"
            autoComplete="given-name"
            placeholder="What should we call you?"
            defaultValue={state?.values?.firstName}
            error={state?.fieldErrors?.firstName}
            required
          />

          <Input
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@email.com"
            defaultValue={
              state?.values?.email ??
              (typeof returnedEmail === "string" ? returnedEmail : undefined)
            }
            error={state?.fieldErrors?.email}
            required
          />

          <div className="flex flex-col gap-2">
            <Input
              label="Password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={state?.fieldErrors?.password}
              required
            />
            <ul className="flex flex-wrap gap-x-4 gap-y-1 font-sans text-xs" aria-label="Password needs">
              {rules.map((rule) => (
                <li
                  key={rule.label}
                  className={cn("flex items-center gap-1.5 transition-colors", rule.met ? "text-success-60" : "text-ink-300")}
                >
                  <Tick on={rule.met} />
                  {rule.label}
                  <span className="sr-only">{rule.met ? "(done)" : "(needed)"}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <input type="hidden" name="terms" value="on" />
          <Button type="submit" size="md" fullWidth loading={pending} disabled={!passwordValid}>
            Create account
          </Button>
          <p className="text-center font-sans text-xs leading-relaxed text-ink-300">
            By creating an account you agree to Grouv&rsquo;s{" "}
            <Link href="/terms" className="underline hover:text-ink-600">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="underline hover:text-ink-600">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </form>
    </AuthSplitLayout>
  );
}

function Tick({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="size-3.5" aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2" fill={on ? "currentColor" : "none"} />
      {on && <path d="m5.2 8.2 1.9 1.9 3.7-3.9" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
  );
}
