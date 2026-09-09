"use client";

import { useState } from "react";
import { TopBar } from "@/components/app/TopBar";
import { Button } from "@/components/ui/Button";
import { ArrowRight } from "@/components/ui/ArrowRight";
import { cn } from "@/lib/cn";

/**
 * Deep Focus — Figma frame 296:11390.
 *
 * No top bar or rail on desktop: a single centred 625px column with the clock
 * badge, the pitch, four duration options and the two actions. The phone frame
 * (643:30126) adds a header — Figma titles it "Archive", which reads as a
 * copy-paste slip, so it carries this page's own name.
 */
const DURATIONS = [
  "Until this evening",
  "Until tomorrow, 8am",
  "For 3 days",
  "For a week",
];

export default function DeepFocusPage() {
  const [chosen, setChosen] = useState<string | null>(null);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
    <TopBar title="Deep Focus" back="/settings" phoneOnly />

    <div className="min-h-0 flex-1 scroll-slim overflow-y-auto px-4 py-10 lg:px-8">
      <div className="mx-auto flex w-full max-w-[560px] flex-col gap-6 lg:gap-8">
        <header className="flex flex-col items-center gap-2 text-center">
          <span className="grid size-11 place-items-center rounded-full bg-primary-100 text-primary-500">
            <ClockIcon />
          </span>
          <h1 className="font-display text-xl leading-[1.04] font-semibold text-ink-800 sm:text-2xl lg:text-3xl">
            Go into Deep Focus
          </h1>
          <p className="max-w-[505px] font-sans text-sm text-ink-400">
            Grouv locks until you choose to return. No counter waiting for you
            when you come back.
          </p>
        </header>

        <ul className="flex flex-col gap-3">
          {DURATIONS.map((option) => {
            const isOn = chosen === option;
            return (
              <li key={option}>
                <button
                  type="button"
                  onClick={() => setChosen(isOn ? null : option)}
                  aria-pressed={isOn}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-2xl border bg-white p-3.5 text-left transition-colors lg:p-4",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600",
                    isOn
                      ? "border-primary-500 bg-primary-50"
                      : "border-ink-50 hover:border-ivory-600",
                  )}
                >
                  <span className="font-sans text-sm font-medium text-[#1F2937] lg:text-base">
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

        <div className="flex flex-col items-center gap-4">
          <Button
            size="md"
            fullWidth
            iconRight={<ArrowRight />}
            disabled={!chosen}
          >
            Begin Deep Focus
          </Button>
          <Button variant="tertiary" size="md">
            Not now
          </Button>
        </div>
      </div>
    </div>
    </div>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" className="size-6" aria-hidden="true">
      <circle cx="16" cy="16" r="11" stroke="currentColor" strokeWidth="2" />
      <path
        d="M16 9.5V16l4.5 2.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
