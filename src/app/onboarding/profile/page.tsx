"use client";

import { useState, useTransition } from "react";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { useOnboarding } from "@/components/onboarding/OnboardingProvider";
import { FormError } from "@/components/auth/FormError";
import { Button } from "@/components/ui/Button";
import { ArrowRight } from "@/components/ui/ArrowRight";
import { completeOnboarding } from "@/app/onboarding/actions";

/** Onboarding 2 — "This is what makes your profile" (Figma 52:1612). */
export default function ProfilePage() {
  const { chapters, spaces, profile, setProfileField } = useOnboarding();
  const [error, setError] = useState<string>();
  const [saving, startSaving] = useTransition();
  const [skipping, setSkipping] = useState(false);

  // Figma draws these as 160px-tall input fields — long-form answers, so they
  // are textareas rather than single-line inputs.
  const prompts = [
    {
      field: "mind",
      label: "What’s taking up space in your mind?",
      placeholder: "Something you’ve been thinking about lately...",
    },
    {
      field: "workingThrough",
      label: "What are you working through?",
      placeholder:
        "Something you’re navigating, figuring out, or making peace with...",
    },
    {
      field: "lookingFor",
      label: "I’m looking for",
      placeholder:
        "The kind of people, conversations, or connections I’d love to have...",
    },
  ] as const;

  // The last step saves everything the flow collected. Success redirects to
  // /onboarding/ready; only failures come back.
  const finish = (withAnswers: boolean) => {
    setError(undefined);
    setSkipping(!withAnswers);
    startSaving(async () => {
      const result = await completeOnboarding({
        chapters: chapters.map((slug) => ({ slug, phase: spaces[slug]?.[0] ?? "" })),
        profile: withAnswers ? profile : { mind: "", workingThrough: "", lookingFor: "" },
      });
      if (result?.error) setError(result.error);
    });
  };

  return (
    <OnboardingShell step={3} totalSteps={3}>
      <form
        className="mx-auto flex min-h-0 w-full max-w-[663px] flex-1 flex-col justify-center gap-4 lg:gap-6"
        onSubmit={(e) => {
          e.preventDefault();
          finish(true);
        }}
      >
        <header className="flex shrink-0 flex-col gap-2 text-center">
          <h1 className="font-display text-lg leading-[1.04] font-semibold text-ink-700 sm:text-xl lg:text-2xl xl:text-3xl">
            This is what makes your profile
          </h1>
          <p className="font-sans text-xs text-ink-300 lg:text-sm">
            A few honest answers help people get to know the real you. Share only
            what you&rsquo;re comfortable sharing.
          </p>
        </header>

        <FormError message={error} />

        {/* Only the prompts scroll. */}
        <div className="flex min-h-0 flex-col gap-4 scroll-slim overflow-y-auto pr-1">
          {prompts.map(({ field, label, placeholder }) => (
            <div key={field} className="flex shrink-0 flex-col gap-1.5">
              <label
                htmlFor={field}
                className="font-sans text-xs text-ink-500 lg:text-sm"
              >
                {label}
              </label>
              <textarea
                id={field}
                name={field}
                rows={3}
                maxLength={1000}
                placeholder={placeholder}
                value={profile[field]}
                onChange={(e) => setProfileField(field, e.target.value)}
                className="min-h-20 w-full resize-none rounded-lg border border-ink-50 bg-surface px-3.5 py-2.5 font-sans text-sm text-ink-500 shadow-[0px_1px_2px_0px_rgba(23,23,23,0.05)] transition-[border-color,box-shadow] duration-150 placeholder:text-ink-200 focus:border-primary-200 focus:shadow-[0px_0px_0px_4px_rgba(249,189,152,0.25)] focus:outline-none lg:min-h-24"
              />
            </div>
          ))}
        </div>

        <div className="flex shrink-0 flex-col items-center gap-1">
          <Button
            type="submit"
            size="md"
            className="w-[228px]"
            iconRight={<ArrowRight />}
            loading={saving && !skipping}
            disabled={saving}
          >
            Continue
          </Button>
          <Button
            type="button"
            variant="tertiary"
            size="md"
            loading={saving && skipping}
            disabled={saving}
            onClick={() => finish(false)}
          >
            Skip for now
          </Button>
        </div>
      </form>
    </OnboardingShell>
  );
}
