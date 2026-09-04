"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ArrowRight } from "@/components/ui/ArrowRight";
import { cn } from "@/lib/cn";

/**
 * Deep Focus — Figma frame 296:11390.
 *
 * No top bar or rail: a single centred 625px column with the clock badge, the
 * pitch, four duration options and the two actions.
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
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-10 lg:px-8">
      <div className="mx-auto flex w-full max-w-[625px] flex-col gap-8 lg:gap-12">
        <header className="flex flex-col items-center gap-2 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-primary-100 text-primary-500">
            <ClockIcon />
          </span>
          <h1 className="font-display text-2xl leading-[1.04] font-semibold text-ink-800 sm:text-3xl lg:text-4xl xl:text-5xl">
            Go into Deep Focus
          </h1>
          <p className="max-w-[505px] font-sans text-base text-ink-400">
            Grouv locks until you choose to return. No counter waiting for you
            when you come back.
          </p>
        </header>

        <ul className="flex flex-col gap-5">
          {DURATIONS.map((option) => {
            const isOn = chosen === option;
            return (
              <li key={option}>
                <button
                  type="button"
                  onClick={() => setChosen(isOn ? null : option)}
                  aria-pressed={isOn}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-2xl border bg-white p-5 text-left transition-colors",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600",
                    isOn
                      ? "border-primary-500 bg-primary-50"
                      : "border-ink-50 hover:border-ivory-600",
                  )}
                >
                  <span className="font-sans text-lg font-medium text-[#1F2937] lg:text-xl">
                    {option}
                  </span>
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-md border",
                      isOn
                        ? "border-primary-500 bg-primary-500 text-white"
                        : "border-ivory-600 bg-ivory-100",
                    )}
                    aria-hidden="true"
                  >
                    {isOn && (
                      <svg viewBox="0 0 16 16" fill="none" className="size-4">
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
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" className="size-8" aria-hidden="true">
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
