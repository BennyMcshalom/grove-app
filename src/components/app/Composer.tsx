"use client";

import Image from "next/image";
import { useState } from "react";
import { PostingToMenu } from "@/components/app/PostMenu";
import { getChapter } from "@/lib/chapters";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { cn } from "@/lib/cn";

/**
 * Post composer — Figma frame 100:1206 (660px card, 32px padding, 16px radius).
 *
 * Two modes ("Root a thought" / "Just Grouv"), three prompts, a row of
 * progress badges, media chips and the submit button.
 */
const MODES = ["Root a thought", "Just Grouv"];

/** Figma 106:3641 / 106:3642 — "where are you in it?" options. */
const PROGRESS = [
  "Just started",
  "In progress",
  "In the thick of it",
  "Almost done",
  "Wrapping up",
  "Starting over",
];

export function Composer() {
  const [mode, setMode] = useState(MODES[0]);
  const [stage, setStage] = useState<string | null>(null);
  const [anonymous, setAnonymous] = useState(false);
  const [chapter, setChapter] = useState("career");
  const [chapterMenuOpen, setChapterMenuOpen] = useState(false);
  const [attachments, setAttachments] = useState<string[]>([]);

  /** The close button clears the draft rather than doing nothing. */
  const reset = () => {
    setMode(MODES[0]);
    setStage(null);
    setAnonymous(false);
    setAttachments([]);
    setChapterMenuOpen(false);
  };

  return (
    <article className="flex flex-col gap-6 rounded-2xl bg-white p-6 lg:p-8">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="relative size-12 shrink-0">
            <Image
              src="/images/avatar-oreoluwa.png"
              alt=""
              fill
              sizes="48px"
              className="rounded-full border-[1.5px] border-white object-cover"
            />
            <span className="absolute right-0 bottom-0 size-3 rounded-full border border-white bg-[#04802E]" />
          </span>

          <div className="flex flex-col gap-3">
            <span className="font-sans text-base font-bold text-[#101928]">
              Oreoluwa
            </span>
            {/* Figma 110:3828 — this chip opens the "POSTING TO" chapter menu. */}
            <div className="relative w-fit">
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={chapterMenuOpen}
                onClick={() => setChapterMenuOpen((open) => !open)}
                className="flex w-fit items-center gap-2 rounded-full bg-primary-50 px-3 py-1.5 font-sans text-sm font-semibold text-primary-600"
              >
                <BagIcon className="size-4" />
                {getChapter(chapter)?.name ?? "Career"}
                <CaretDownIcon className="size-4" />
              </button>
              {chapterMenuOpen && (
                <PostingToMenu
                  value={chapter}
                  onSelect={setChapter}
                  onClose={() => setChapterMenuOpen(false)}
                />
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          aria-label="Close"
          onClick={reset}
          className="rounded p-3 text-ink-800 transition-colors hover:bg-ivory-200"
        >
          <CloseIcon className="size-5" />
        </button>
      </header>

      <div role="tablist" className="flex">
        {MODES.map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={m === mode}
            onClick={() => setMode(m)}
            className={cn(
              "h-10 flex-1 border-b-2 px-4 py-2 font-sans text-sm font-medium transition-colors",
              m === mode
                ? "border-primary-600 text-ink-500"
                : "border-ivory-600 text-ink-400 hover:text-ink-500",
            )}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-6">
          <Field
            label="What are you doing right now?"
            name="doing"
            rows={2}
          />

          <fieldset className="flex flex-col gap-4">
            <legend className="font-sans text-sm font-medium tracking-wide text-ink-500 uppercase">
              Where are you in it? · Optional
            </legend>
            <div className="flex flex-wrap gap-4">
              {PROGRESS.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={stage === option}
                  onClick={() => setStage(stage === option ? null : option)}
                  className={cn(
                    "rounded-full px-4 py-2 font-sans text-sm font-semibold transition-colors",
                    stage === option
                      ? "bg-primary-500 text-white"
                      : "bg-primary-50 text-primary-600 hover:bg-primary-100",
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          </fieldset>

          <Field
            label="One honest thing about where you are"
            name="honest"
            rows={3}
          />
        </div>

        <Checkbox
          label="Post anonymously"
          checked={anonymous}
          onChange={(e) => setAnonymous(e.target.checked)}
        />
      </div>

      <footer className="flex items-center justify-between gap-4 border-t border-ink-50 pt-6">
        <div className="flex items-center gap-3">
          <MediaChip
            icon={<ImagesIcon className="size-4" />}
            label="Photo"
            accept="image/*"
            onPick={(names) => setAttachments((a) => [...a, ...names])}
          />
          <MediaChip
            icon={<VideoIcon className="size-4" />}
            label="Video"
            accept="video/*"
            onPick={(names) => setAttachments((a) => [...a, ...names])}
          />
          {attachments.length > 0 && (
            <span className="font-sans text-xs text-ink-300">
              {attachments.length} attached
            </span>
          )}
        </div>
        <Button size="sm">Root this</Button>
      </footer>
    </article>
  );
}

function Field({
  label,
  name,
  rows,
}: {
  label: string;
  name: string;
  rows: number;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={name}
        className="font-sans text-sm font-medium tracking-wide text-ink-500 uppercase"
      >
        {label}
      </label>
      <textarea
        id={name}
        name={name}
        rows={rows}
        className="w-full resize-y rounded-lg bg-ivory-100 px-3.5 py-2.5 font-sans text-base text-ink-500 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] outline-none placeholder:text-ink-200 focus:shadow-[0px_0px_0px_4px_rgba(249,189,152,0.25)]"
      />
    </div>
  );
}

/** Figma 106:1234 / 106:1261 — ivory-400 pill with a leading icon. */
function MediaChip({
  icon,
  label,
  accept,
  onPick,
}: {
  icon: React.ReactNode;
  label: string;
  accept: string;
  onPick: (names: string[]) => void;
}) {
  // `relative` matters: the sr-only input is absolutely positioned, and with
  // no positioned ancestor it resolves against the initial containing block,
  // escaping the app shell's overflow and stretching the page.
  return (
    <label className="relative flex cursor-pointer items-center gap-2 rounded-full bg-ivory-400 px-3 py-1.5 font-sans text-sm font-semibold text-ivory-900 transition-colors hover:bg-ivory-500">
      {icon}
      {label}
      <input
        type="file"
        accept={accept}
        multiple
        className="sr-only"
        onChange={(e) =>
          onPick(Array.from(e.target.files ?? []).map((f) => f.name))
        }
      />
    </label>
  );
}

function BagIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path
        d="M2 5.5h12v8H2v-8ZM5.5 5.5V4a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1.5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CaretDownIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path
        d="m4 6 4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path
        d="m3.5 3.5 9 9m0-9-9 9"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ImagesIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <rect
        x="2"
        y="3.5"
        width="12"
        height="9"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <path
        d="m3 10.5 3-2.5 3 2.5 2-1.5 2 1.5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function VideoIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <rect
        x="2"
        y="4"
        width="8.5"
        height="8"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <path
        d="M10.5 8.5 14 6.5v5l-3.5-2v-1Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}
