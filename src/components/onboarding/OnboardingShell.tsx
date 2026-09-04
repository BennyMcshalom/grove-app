"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Onboarding chrome — Figma component 52:1502: a back button on the left and
 * progress dots on the right.
 *
 * The page itself never scrolls (`h-dvh` + `overflow-hidden`). Figma marks
 * only the option list as scrollable — layout_D5T24D and layout_CIL4QJ both
 * carry `overflowScroll: y` on a fixed-height frame — so the header and the
 * action button stay put while just that list moves.
 *
 * Children are placed in a `min-h-0 flex-1` column; a page puts
 * `min-h-0 flex-1 overflow-y-auto` on whichever section should scroll.
 * (`min-h-0` matters: without it a flex child refuses to shrink below its
 * content and the scrollbar lands on the page instead.)
 */
export function OnboardingShell({
  step,
  totalSteps,
  children,
  onBack,
}: {
  step: number;
  totalSteps: number;
  children: ReactNode;
  onBack?: () => void;
}) {
  const router = useRouter();

  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-ivory-100">
      <header className="flex shrink-0 items-center justify-between px-4 py-2 sm:px-6 lg:px-16 lg:py-4">
        <button
          type="button"
          onClick={onBack ?? (() => router.back())}
          aria-label="Go back"
          className="flex items-center gap-2 rounded-xl p-2 text-[#1F2937] transition-colors hover:bg-ivory-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
        >
          <CaretLeft />
        </button>

        <div
          className="flex items-center gap-1.5"
          role="progressbar"
          aria-valuenow={step}
          aria-valuemin={1}
          aria-valuemax={totalSteps}
          aria-label={`Step ${step} of ${totalSteps}`}
        >
          {Array.from({ length: totalSteps }).map((_, index) => (
            <span
              key={index}
              className={cn(
                "h-2 rounded-3xl transition-all duration-200",
                index === step - 1 ? "w-7 bg-primary-600" : "w-2 bg-ivory-600",
              )}
            />
          ))}
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col px-4 pb-3 sm:px-6 lg:px-16 lg:pb-5">
        {children}
      </div>
    </main>
  );
}

function CaretLeft() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-6" aria-hidden="true">
      <path
        d="M15 4.5 7.5 12l7.5 7.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
