"use client";

import { useRouter } from "next/navigation";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { useOnboarding } from "@/components/onboarding/OnboardingProvider";
import { Button } from "@/components/ui/Button";
import { ArrowRight } from "@/components/ui/ArrowRight";

/** Onboarding 2 — "This is what makes your profile" (Figma 52:1612). */
export default function ProfilePage() {
  const router = useRouter();
  const { profile, setProfileField } = useOnboarding();

  // Figma draws these as 160px-tall input fields — long-form answers, so they
  // are textareas rather than single-line inputs.
  const prompts = [
    { field: "mind", label: "What’s taking up space in your mind?" },
    { field: "workingThrough", label: "What are you working through?" },
    { field: "lookingFor", label: "I’m looking for" },
  ] as const;

  return (
    <OnboardingShell step={3} totalSteps={3}>
      <form
        className="mx-auto flex min-h-0 w-full max-w-[663px] flex-1 flex-col justify-center gap-4 lg:gap-6"
        onSubmit={(e) => {
          e.preventDefault();
          router.push("/onboarding/ready");
        }}
      >
        <header className="flex shrink-0 flex-col gap-2 text-center">
          <h1 className="font-display text-2xl leading-[1.04] font-semibold text-[#1F2937] sm:text-3xl lg:text-4xl xl:text-5xl">
            This is what makes your profile
          </h1>
          <p className="font-sans text-sm text-ink-300 lg:text-base xl:text-lg">
            A few honest answers help people get to know the real you. Share only
            what you&rsquo;re comfortable sharing.
          </p>
        </header>

        {/* Only the prompts scroll. */}
        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto pr-1">
          {prompts.map(({ field, label }) => (
            <div key={field} className="flex shrink-0 flex-col gap-1.5">
              <label
                htmlFor={field}
                className="font-sans text-sm text-ink-500 lg:text-base"
              >
                {label}
              </label>
              <textarea
                id={field}
                name={field}
                rows={3}
                value={profile[field]}
                onChange={(e) => setProfileField(field, e.target.value)}
                className="min-h-24 w-full resize-y rounded-lg border border-ink-50 bg-white px-3.5 py-2.5 font-sans text-base text-ink-500 shadow-[0px_1px_2px_0px_rgba(23,23,23,0.05)] transition-[border-color,box-shadow] duration-150 placeholder:text-ink-200 focus:border-primary-200 focus:shadow-[0px_0px_0px_4px_rgba(249,189,152,0.25)] focus:outline-none lg:min-h-32"
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
          >
            Continue
          </Button>
          <Button
            type="button"
            variant="tertiary"
            size="md"
            onClick={() => router.push("/onboarding/ready")}
          >
            Skip for now
          </Button>
        </div>
      </form>
    </OnboardingShell>
  );
}
