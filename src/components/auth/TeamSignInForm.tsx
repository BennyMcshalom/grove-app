"use client";

import { useActionState, type ReactNode } from "react";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { FormError } from "@/components/auth/FormError";
import { ArrowRight } from "@/components/ui/ArrowRight";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { teamSignIn } from "@/lib/auth/team-sign-in";

/** Team sign-in, in the same look as Sign in (Figma 23:125). */
export function TeamSignInForm({ needsKey, footer }: { needsKey: boolean; footer?: ReactNode }) {
  const [state, formAction, pending] = useActionState(teamSignIn, undefined);

  return (
    <AuthSplitLayout>
      <form action={formAction} className="flex flex-col gap-5 lg:gap-6">
        <header className="flex flex-col gap-2">
          <h1 className="font-display text-2xl leading-tight font-semibold text-ink-800 sm:text-3xl">
            Team sign-in
          </h1>
          <p className="font-sans text-sm text-ink-300 lg:text-base">
            {needsKey ? "For the Grouv team on staging." : "Local development only."} Signs you in to an existing
            account without a password.
          </p>
        </header>

        <FormError message={state?.error} />

        <div className="flex flex-col gap-4 lg:gap-5">
          <div className="flex flex-col gap-4">
            <Input
              label="Account email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="johndoe@email.com"
              defaultValue={state?.email}
              required
            />
            {needsKey && (
              <Input
                label="Team key"
                name="key"
                type="password"
                autoComplete="off"
                placeholder="Enter the team key"
                required
              />
            )}
          </div>

          <Button type="submit" size="md" fullWidth iconRight={<ArrowRight />} loading={pending}>
            Continue
          </Button>
        </div>
        {footer && <p className="text-center font-sans text-sm text-ink-400">{footer}</p>}
      </form>
    </AuthSplitLayout>
  );
}
