"use client";

import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { useOnboarding } from "@/components/onboarding/OnboardingProvider";
import { Button } from "@/components/ui/Button";
import { ArrowRight } from "@/components/ui/ArrowRight";
import { getChapter } from "@/lib/chapters";
import { cn } from "@/lib/cn";

/**
 * "<Chapter>, where are you?" — Figma frames 48:945 and 52:1187 … 52:1412.
 *
 * Those eight frames differ only in heading, icon tint and option list, so
 * they collapse into this one route parameterised by chapter slug.
 *
 * Figma puts `overflowScroll: y` on the option list (layout_D5T24D), so the
 * heading and button stay fixed and only the list moves.
 */
export default function SpacePage() {
  const router = useRouter();
  const params = useParams<{ chapter: string }>();
  const { chapters, spaces, setSpaceOptions, spaceIndex } = useOnboarding();

  const chapter = getChapter(params.chapter);
  const selected = spaces[params.chapter] ?? [];
  const position = spaceIndex(params.chapter);

  // Deep-linking into a chapter the user never picked has nothing to answer.
  useEffect(() => {
    if (chapters.length > 0 && position === -1) {
      router.replace("/onboarding/chapters");
    }
  }, [chapters.length, position, router]);

  if (!chapter) {
    return (
      <OnboardingShell step={2} totalSteps={3}>
        <p className="m-auto font-sans text-lg text-ink-300">
          That chapter doesn&rsquo;t exist.
        </p>
      </OnboardingShell>
    );
  }

  // One answer per chapter: choosing an option replaces the last one, and
  // choosing the current one clears it.
  const choose = (option: string) => {
    setSpaceOptions(chapter.slug, selected.includes(option) ? [] : [option]);
  };

  const goNext = () => {
    const next = chapters[position + 1];
    router.push(next ? `/onboarding/spaces/${next}` : "/onboarding/profile");
  };

  return (
    <OnboardingShell step={2} totalSteps={3}>
      {/* The column is wider than the option list so the heading gets room to
          stay on one line — "Relationships, where are you?" needs ~700px at the
          desktop size, and capping it at the list's 625px was forcing a wrap.
          The list itself is still constrained to 625px below. */}
      <div className="mx-auto flex min-h-0 w-full max-w-[760px] flex-1 flex-col justify-center gap-4 lg:gap-6">
        <header className="flex shrink-0 flex-col gap-1.5">
          <p className="text-center font-sans text-xs tracking-wide text-ink-200 uppercase lg:text-sm">
            Space {Math.max(position, 0) + 1} of {chapters.length || 1}
          </p>
          <div className="flex items-center justify-center gap-2">
            <Image
              src={chapter.icon}
              alt=""
              width={56}
              height={56}
              className="size-8 shrink-0 lg:size-9"
            />
            {/* text-balance keeps the wrap even on narrow phones, where the
                longest chapter names cannot fit on one line at any size. */}
            <h1 className="text-balance font-display text-lg leading-[1.15] font-semibold text-[#1F2937] sm:text-xl lg:text-2xl xl:text-3xl">
              {chapter.name}, where are you?
            </h1>
          </div>
        </header>

        {/* Only this list scrolls — Figma layout_D5T24D. */}
        <ul
          role="radiogroup"
          aria-label={`${chapter.name}, where are you?`}
          className="scroll-slim mx-auto flex w-full min-h-0 max-w-[560px] flex-col gap-2.5 overflow-y-auto pr-1 lg:gap-3"
        >
          {chapter.options.map((option) => {
            const isOn = selected.includes(option);
            return (
              <li key={option} className="shrink-0">
                <button
                  type="button"
                  role="radio"
                  onClick={() => choose(option)}
                  aria-checked={isOn}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-2xl border bg-white p-3.5 text-left lg:p-4",
                    "transition-colors duration-150",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600",
                    isOn
                      ? "border-primary-500 bg-primary-50"
                      : "border-ink-50 hover:border-ivory-600",
                  )}
                >
                  <span className="font-sans text-sm font-medium text-[#1F2937] lg:text-base xl:text-lg">
                    {option}
                  </span>
                  <span
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-md border",
                      isOn
                        ? "border-primary-500 bg-primary-500 text-white"
                        : "border-transparent bg-ivory-100",
                    )}
                    aria-hidden="true"
                  >
                    {isOn && (
                      <svg viewBox="0 0 16 16" fill="none" className="size-3.5">
                        <path
                          d="m3.5 8.5 3 3 6-6"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="flex shrink-0 justify-center">
          <Button
            size="md"
            iconRight={<ArrowRight />}
            disabled={selected.length === 0}
            onClick={goNext}
          >
            That&rsquo;s where i am
          </Button>
        </div>
      </div>
    </OnboardingShell>
  );
}
