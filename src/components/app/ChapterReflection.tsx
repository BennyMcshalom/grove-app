"use client";

import Image from "next/image";

/**
 * Career Reflection — Figma frame 433:17518.
 *
 * A 660px white card: the "<Chapter> Reflection" title with a close button,
 * three prompts, then the chapter's tallies and the bond it released.
 */
const PROMPTS = [
  "What this chapter taught me",
  "What i’d tell someone stating",
  "Who i’m carrying forward",
];

const TALLIES = ["34 posts", "34 Curio reads ", "Wander Saves"];

export function ChapterReflection({
  chapter,
  onClose,
}: {
  chapter: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-900/40 p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${chapter} Reflection`}
        onClick={(e) => e.stopPropagation()}
        className="my-auto flex w-full max-w-[660px] flex-col gap-6 rounded-2xl bg-white p-6 sm:p-8"
      >
        <header className="flex items-center justify-between gap-4">
          <h2 className="font-display text-2xl font-semibold text-ink-800">
            {chapter} Reflection
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded p-3 text-ink-800 transition-colors hover:bg-ivory-200"
          >
            <CloseIcon />
          </button>
        </header>

        {PROMPTS.map((prompt) => (
          <label key={prompt} className="flex flex-col gap-1.5">
            <span className="font-sans text-sm font-medium text-ink-500">
              {prompt}
            </span>
            <textarea
              rows={2}
              className="w-full resize-y rounded-lg bg-ivory-100 px-3.5 py-2.5 font-sans text-base text-ink-500 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] outline-none focus:shadow-[0px_0px_0px_4px_rgba(249,189,152,0.25)]"
            />
          </label>
        ))}

        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {TALLIES.map((tally, i) => (
              <span key={tally} className="flex items-center gap-3">
                {i > 0 && <span className="size-1.5 rounded-full bg-[#D9D9D9]" />}
                <span className="font-sans text-sm text-ink-400">{tally}</span>
              </span>
            ))}
          </div>

          <div className="flex items-center gap-2 py-1.5">
            <span className="relative size-8 shrink-0 overflow-hidden rounded-full">
              <Image
                src="/images/people/jesse.png"
                alt=""
                fill
                sizes="32px"
                className="object-cover"
              />
            </span>
            <span className="font-sans text-sm text-ink-200">
              Bond with Jesse was released
            </span>
          </div>
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
