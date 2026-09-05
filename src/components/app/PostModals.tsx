"use client";

import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { Post } from "@/components/app/PostCard";
import { cn } from "@/lib/cn";

/**
 * The post modals — Figma frames 115:6758 (Edit), 115:7248 (Report) and the
 * 115:7207 delete confirmation.
 *
 * All three are the same 660px white card; copy, chips and button labels are
 * Figma's.
 */
const PROGRESS = [
  "Just started",
  "In progress",
  "In the thick of it",
  "Almost done",
  "Wrapping up",
  "Starting over",
];

const REASONS = ["Spam", "Harrassment", "Inappropriate", "Other"];

function Shell({
  label,
  onClose,
  children,
  header,
}: {
  label: string;
  onClose: () => void;
  children: React.ReactNode;
  header?: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-900/40 p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onClick={(e) => e.stopPropagation()}
        className="my-auto flex w-full max-w-[660px] flex-col gap-6 rounded-2xl bg-white p-6 sm:p-8"
      >
        <header className="flex items-center justify-between gap-4">
          {header ?? (
            <h2 className="font-display text-2xl font-semibold text-[#101928]">
              {label}
            </h2>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded p-3 text-ink-800 transition-colors hover:bg-ivory-200"
          >
            <CloseIcon />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}

/** Edit — Figma 115:6758. */
export function EditPostModal({
  post,
  onClose,
  onSave,
}: {
  post: Post;
  onClose: () => void;
  onSave: () => void;
}) {
  const [doing, setDoing] = useState(post.title ?? "");
  const [honest, setHonest] = useState(post.body);
  const [stage, setStage] = useState<string | null>(post.badge ?? null);

  return (
    <Shell
      label="Edit post"
      onClose={onClose}
      header={
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
            <span className="flex w-fit items-center gap-2 rounded-full bg-primary-50 px-3 py-1.5 font-sans text-sm font-semibold text-primary-600">
              Career
            </span>
          </div>
        </div>
      }
    >
      {post.media && (
        <div className="relative h-[220px] w-full overflow-hidden rounded-lg sm:h-[332px]">
          <Image
            src={post.media.src}
            alt=""
            fill
            sizes="600px"
            className="object-cover"
          />
        </div>
      )}

      <form
        className="flex flex-col gap-6"
        onSubmit={(e) => {
          e.preventDefault();
          onSave();
        }}
      >
        <label className="flex flex-col gap-1.5">
          <span className="font-sans text-sm font-medium text-ink-500">
            WHAT ARE YOU DOING RIGHT NOW?
          </span>
          <textarea
            value={doing}
            onChange={(e) => setDoing(e.target.value)}
            rows={3}
            className={FIELD}
          />
        </label>

        <fieldset className="flex flex-col gap-4">
          <legend className="font-sans text-sm font-medium text-ink-500">
            WHERE ARE YOU IN IT? &middot; OPTIONAL
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

        <label className="flex flex-col gap-1.5">
          <span className="font-sans text-sm font-medium text-ink-500">
            ONE HONEST THING ABOUT WHERE YOU ARE
          </span>
          <textarea
            value={honest}
            onChange={(e) => setHonest(e.target.value)}
            rows={4}
            className={FIELD}
          />
        </label>

        <div className="flex items-center justify-end gap-8 border-t border-ink-50 pt-6">
          <Button variant="secondary" size="sm" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" type="submit">
            Save changes
          </Button>
        </div>
      </form>
    </Shell>
  );
}

/** Report this — Figma 115:7248. */
export function ReportPostModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: () => void;
}) {
  const [reason, setReason] = useState<string | null>(null);

  return (
    <Shell label="Report this" onClose={onClose}>
      <form
        className="flex flex-col gap-8"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <div className="flex flex-col gap-6">
          <fieldset className="flex flex-col gap-4">
            <legend className="font-sans text-sm font-medium text-ink-500">
              WHAT&rsquo;S WRONG WITH IT?
            </legend>
            <div className="flex flex-wrap items-center gap-4">
              {REASONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={reason === option}
                  onClick={() => setReason(option)}
                  className={cn(
                    "rounded-full px-4 py-2 font-sans text-base font-medium transition-colors",
                    reason === option
                      ? "bg-primary-500 text-white"
                      : "bg-primary-50 text-primary-600 hover:bg-primary-100",
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="flex flex-col gap-1.5">
            <span className="font-sans text-sm font-medium text-ink-500">
              ANYTHING ELSE WE SHOULD KNOW? (OPTIONAL)
            </span>
            <textarea rows={4} className={cn(FIELD, "h-[131px]")} />
          </label>
        </div>

        <div className="border-t border-ink-50 pt-6">
          <Button size="sm" fullWidth type="submit" disabled={!reason}>
            Submit Report
          </Button>
        </div>
      </form>
    </Shell>
  );
}

/** "Are you sure you want to delete this post?" — Figma alert 115:7207. */
export function DeletePostModal({
  onClose,
  onDelete,
}: {
  onClose: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4"
      onClick={onClose}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label="Delete this post?"
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-[400px] gap-4 rounded-lg border border-destructive-60 bg-destructive-5 p-4"
      >
        <ErrorIcon />
        <div className="flex flex-1 flex-col gap-2">
          <p className="font-sans text-base font-semibold text-ink-700">
            Are you sure you want to delete this post?
          </p>
          <p className="font-sans text-sm text-ink-400">
            This action can&rsquo;t be undone. Your post and its comments will
            be permanently removed.
          </p>
          <div className="flex gap-4 pt-1">
            <button
              type="button"
              onClick={onDelete}
              className="rounded-full bg-destructive-60 px-4 py-2 font-ui text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              Delete
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-4 py-2 font-ui text-sm font-medium text-ink-400 transition-colors hover:bg-white"
            >
              Cancel
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="h-fit shrink-0 text-ink-400 transition-colors hover:text-ink-600"
        >
          <CloseIcon />
        </button>
      </div>
    </div>
  );
}

const FIELD =
  "w-full resize-y rounded-lg bg-ivory-100 px-3.5 py-2.5 font-sans text-base text-ink-500 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] outline-none placeholder:text-ink-200 focus:shadow-[0px_0px_0px_4px_rgba(249,189,152,0.25)]";

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

function ErrorIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="size-6 shrink-0 text-destructive-60"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 7.5v5.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="12" cy="16.2" r="1" fill="currentColor" />
    </svg>
  );
}
