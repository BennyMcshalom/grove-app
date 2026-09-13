"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { FormError } from "@/components/auth/FormError";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { GoogleButton, OrDivider } from "@/components/ui/GoogleButton";
import { ArrowRight } from "@/components/ui/ArrowRight";
import { signIn } from "@/lib/auth/actions";

export function SignInForm({
  next,
  initialError,
}: {
  /** Where the proxy was sending them before it asked them to sign in. */
  next?: string;
  initialError?: string;
}) {
  const [state, formAction, pending] = useActionState(signIn, undefined);
  const error = state ? state.error : initialError;

  return (
    <AuthSplitLayout>
      <form action={formAction} className="flex flex-col gap-5 lg:gap-6">
        <header className="flex flex-col gap-2">
          <h1 className="font-display text-2xl leading-[1.04] font-semibold sm:text-3xl lg:text-4xl xl:text-5xl text-[#1F2937] ">
            Welcome back
          </h1>
          <p className="font-sans text-sm text-ink-300 lg:text-base">
            New here?{" "}
            <Link
              href="/sign-up"
              className="font-semibold text-primary-500 hover:underline"
            >
              Create account
            </Link>
          </p>
        </header>

        <FormError message={error} />
        {next && <input type="hidden" name="next" value={next} />}

        <div className="flex flex-col gap-4 lg:gap-5">
          <div className="flex flex-col gap-4">
            <Input
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="johndoe@email.com"
              defaultValue={state?.values?.email}
              error={state?.fieldErrors?.email}
              required
            />
            <Input
              label="Password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              error={state?.fieldErrors?.password}
              required
            />
          </div>

          <Button
            type="submit"
            size="md"
            fullWidth
            iconRight={<ArrowRight />}
            loading={pending}
          >
            Continue
          </Button>
        </div>

        <OrDivider />
        <GoogleButton />
      </form>
    </AuthSplitLayout>
  );
}
