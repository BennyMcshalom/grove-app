"use client";

import { Avatar } from "@/components/app/Avatar";

/**
 * Career Reflection — Figma frame 433:17518.
 *
 * A 660px white card: the "<Chapter> Reflection" title with a close button,
 * the three answers from the Close Chapter wizard, any extra reflections, then
 * the chapter's tallies and the bonds it released.
 */
export interface Reflection {
  taught: string | null;
  advice: string | null;
  carryingForward: string | null;
  reflections: string[];
  postCount: number;
  logCount: number;
  releasedBonds: { name: string; avatarUrl: string | null }[];
}

const plural = (count: number, one: string, many: string) =>
  `${count} ${count === 1 ? one : many}`;

export function ChapterReflection({
  chapter,
  reflection,
  onClose,
}: {
  chapter: string;
  reflection: Reflection;
  onClose: () => void;
}) {
  const answers = [
    { prompt: "What this chapter taught me", value: reflection.taught },
    { prompt: "What i’d tell someone starting", value: reflection.advice },
    { prompt: "Who i’m carrying forward", value: reflection.carryingForward },
    ...reflection.reflections.map((value) => ({ prompt: "Reflection", value })),
  ];

  const tallies = [
    plural(reflection.postCount, "post", "posts"),
    plural(reflection.logCount, "log moment", "log moments"),
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center scroll-slim overflow-y-auto bg-ink-900/40 p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${chapter} Reflection`}
        onClick={(e) => e.stopPropagation()}
        className="my-auto flex w-full max-w-[660px] flex-col gap-6 rounded-2xl bg-surface p-6 sm:p-8"
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

        {answers.map(({ prompt, value }, i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <span className="font-sans text-sm font-medium text-ink-500">{prompt}</span>
            <p className="w-full rounded-lg bg-ivory-100 px-3.5 py-2.5 font-sans text-base whitespace-pre-line text-ink-500 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
              {value ?? <span className="text-ink-200">Left unanswered</span>}
            </p>
          </div>
        ))}

        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {tallies.map((tally, i) => (
              <span key={tally} className="flex items-center gap-3">
                {i > 0 && <span className="size-1.5 rounded-full bg-ivory-600" />}
                <span className="font-sans text-sm text-ink-400">{tally}</span>
              </span>
            ))}
          </div>

          {reflection.releasedBonds.map((bond) => (
            <div key={bond.name} className="flex items-center gap-2 py-1.5">
              <Avatar src={bond.avatarUrl} name={bond.name} sizes="32px" className="size-8" />
              <span className="font-sans text-sm text-ink-200">
                Bond with {bond.name} was released
              </span>
            </div>
          ))}
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
