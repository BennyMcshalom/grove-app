"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { useOnboarding } from "@/components/onboarding/OnboardingProvider";
import { Button } from "@/components/ui/Button";
import { ArrowRight } from "@/components/ui/ArrowRight";
import { CHAPTERS, MAX_CHAPTERS } from "@/lib/chapters";
import { cn } from "@/lib/cn";

/** Onboarding 1 — "Which chapters of life are you in?" (Figma 36:858). */
export default function ChaptersPage() {
  const router = useRouter();
  const { chapters, toggleChapter } = useOnboarding();
  const atLimit = chapters.length >= MAX_CHAPTERS;

  return (
    <OnboardingShell step={1} totalSteps={3} onBack={() => router.push("/")}>
      {/* The whole block scrolls, not a small window inside it. Scrolling a
          short grid viewport always slices a row in half; scrolling the block
          means you only ever see complete cards. `min-h-full` + `justify-center`
          centres it while it fits and grows from the top when it doesn't, so
          nothing is ever pushed above the scroll origin and clipped. */}
      <div className="min-h-0 flex-1 snap-y snap-proximity overflow-y-auto">
        <div className="mx-auto flex min-h-full w-full max-w-[1216px] flex-col justify-center gap-3 py-1 lg:gap-5">
          <header className="flex shrink-0 flex-col gap-2 text-center">
            <h1 className="mx-auto max-w-[784px] font-display text-xl leading-[1.04] font-semibold text-[#1F2937] sm:text-2xl lg:text-3xl xl:text-4xl [@media(max-height:680px)]:text-lg">
              Which chapters of life are you in?
            </h1>
            <p className="font-sans text-xs text-ink-300 lg:text-sm xl:text-base">
              Choose up to {MAX_CHAPTERS} chapters that reflect where you are
              right now. These will shape the spaces and people you discover on
              Grouv.
            </p>
          </header>

          {/* `content-start` + `auto-rows-min` keep rows at their natural height
            instead of stretching to fill, which had inflated the cards. */}
          <ul className="mx-auto grid w-full max-w-[960px] shrink-0 auto-rows-min grid-cols-2 content-start gap-3 lg:grid-cols-4 lg:gap-4">
            {CHAPTERS.map((chapter) => {
              const selected = chapters.includes(chapter.slug);
              // Once four are held, the rest are inert until one is released.
              const disabled = !selected && atLimit;

              return (
                <li key={chapter.slug} className="snap-start scroll-mt-2">
                  <button
                    type="button"
                    onClick={() => toggleChapter(chapter.slug)}
                    disabled={disabled}
                    aria-pressed={selected}
                    className={cn(
                      "flex h-full w-full flex-col items-center gap-1.5 rounded-2xl bg-white px-3 py-4 lg:gap-2 lg:px-4 lg:py-5",
                      // Width breakpoints can't see a short window, so compact on
                      // height too — otherwise a 560px-tall viewport clips a row.
                      "[@media(max-height:680px)]:gap-1 [@media(max-height:680px)]:py-2.5 [@media(max-height:680px)]:lg:py-3",
                      "shadow-[0px_1px_2px_0px_rgba(23,23,23,0.05)] transition-all duration-150",
                      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600",
                      selected
                        ? "ring-2 ring-primary-500"
                        : "ring-1 ring-ivory-600",
                      disabled
                        ? "cursor-not-allowed opacity-40"
                        : "hover:-translate-y-0.5 hover:shadow-md",
                    )}
                  >
                    <Image
                      src={chapter.icon}
                      alt=""
                      width={56}
                      height={56}
                      className="size-8 shrink-0 lg:size-10 [@media(max-height:680px)]:size-7 [@media(max-height:680px)]:lg:size-8"
                    />
                    <span className="flex flex-col gap-0.5">
                      <span className="font-display text-sm font-bold text-[#1F2937] lg:text-base xl:text-lg">
                        {chapter.name}
                      </span>
                      <span className="font-sans text-[11px] leading-snug text-ink-300 lg:text-xs xl:text-sm">
                        {chapter.tagline}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="flex shrink-0 flex-col items-center gap-1.5 lg:gap-2">
            <p className="flex flex-wrap justify-center gap-x-3 gap-y-0.5 text-center">
              <span className="font-sans text-xs font-medium text-primary-500 lg:text-sm">
                {chapters.length}/{MAX_CHAPTERS} chosen
              </span>
              <span className="font-sans text-xs text-ink-300 lg:text-sm">
                You can only hold {MAX_CHAPTERS} chapters at once
              </span>
            </p>

            <Button
              size="md"
              iconRight={<ArrowRight />}
              disabled={chapters.length === 0}
              onClick={() => router.push(`/onboarding/spaces/${chapters[0]}`)}
            >
              These are my chapters
            </Button>
          </div>
        </div>
      </div>
    </OnboardingShell>
  );
}
