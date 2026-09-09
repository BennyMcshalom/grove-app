"use client";

import Image from "next/image";
import { useState } from "react";
import { ArrowRight } from "@/components/ui/ArrowRight";
import { Button } from "@/components/ui/Button";
import type { Chapter } from "@/lib/chapters";
import { cn } from "@/lib/cn";

/**
 * Join Wealth — Figma frame 223:14200.
 *
 * A 660px card: the chapter glyph in its tint beside "<Chapter>, where are
 * you?", the chapter's options as bordered rows with a marker each, and
 * "That's where i am" above a top rule. The options come from the chapter
 * table, so every directory chapter opens the same sheet.
 *
 * It asks the same question as the onboarding space step, so it takes the
 * same single answer.
 */
export function JoinSpaceModal({
  chapter,
  onClose,
  onJoin,
}: {
  chapter: Chapter;
  onClose: () => void;
  onJoin: (options: string[]) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);

  const choose = (option: string) =>
    setSelected((prev) => (prev.includes(option) ? [] : [option]));

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center scroll-slim overflow-y-auto bg-ink-900/40 p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Join ${chapter.name}`}
        onClick={(e) => e.stopPropagation()}
        className="my-auto flex w-full max-w-[560px] flex-col gap-6 rounded-2xl bg-white p-5 sm:p-6"
      >
        <header className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-2">
            {/* The exported glyph already carries its own tinted circle, so it
                needs no wrapper of its own. */}
            <Image
              src={chapter.icon}
              alt=""
              width={56}
              height={56}
              className="size-9 shrink-0"
            />
            <h2 className="font-display text-lg font-semibold text-ink-800 sm:text-xl">
              {chapter.name}, where are you?
            </h2>
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded p-3 text-ink-800 transition-colors hover:bg-ivory-200"
          >
            <CloseIcon />
          </button>
        </header>

        <ul
          role="radiogroup"
          aria-label={`${chapter.name}, where are you?`}
          className="flex flex-col gap-2.5 sm:gap-3"
        >
          {chapter.options.map((option) => {
            const on = selected.includes(option);
            return (
              <li key={option}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => choose(option)}
                  className={cn(
                    "flex w-full items-center justify-between gap-4 rounded-2xl border p-3.5 text-left transition-colors sm:p-4",
                    on
                      ? "border-primary-500 bg-primary-50"
                      : "border-ink-50 bg-white hover:bg-ivory-100",
                  )}
                >
                  <span className="font-sans text-sm font-medium text-[#1F2937] sm:text-base">
                    {option}
                  </span>
                  <span
                    className={cn(
                      "grid size-5 shrink-0 place-items-center rounded-md border",
                      on
                        ? "border-primary-500 bg-primary-500 text-white"
                        : "border-transparent bg-ivory-100",
                    )}
                  >
                    {on && (
                      <svg
                        viewBox="0 0 16 16"
                        fill="none"
                        className="size-3.5"
                        aria-hidden="true"
                      >
                        <path
                          d="m3.5 8.5 3 3 6-7"
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

        <div className="border-t border-ink-50 pt-5">
          <Button
            size="sm"
            fullWidth
            disabled={selected.length === 0}
            iconRight={<ArrowRight className="size-5" />}
            onClick={() => onJoin(selected)}
          >
            That&rsquo;s where i am
          </Button>
        </div>
      </div>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="size-5" aria-hidden="true">
      <path
        d="m3.5 3.5 9 9m0-9-9 9"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
