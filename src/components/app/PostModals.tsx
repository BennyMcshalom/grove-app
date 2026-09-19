"use client";

import { Photo, Video } from "@/components/ui/Media";
import { withTrim } from "@/lib/media-draft";
import { useState, useTransition } from "react";
import { Avatar } from "@/components/app/Avatar";
import { useViewer } from "@/components/app/ViewerProvider";
import { FormError } from "@/components/auth/FormError";
import { Button } from "@/components/ui/Button";
import { deletePost, reportContent, updatePost } from "@/lib/post-actions";
import { getChapter } from "@/lib/chapters";
import { PROGRESS, REPORT_REASONS, type Post, type PostProgress, type ReportReason } from "@/lib/posts";
import { cn } from "@/lib/cn";

/**
 * The post modals — Figma frames 115:6758 (Edit), 115:7248 (Report) and the
 * 115:7207 delete confirmation.
 *
 * All three are the same 660px white card; copy, chips and button labels are
 * Figma's.
 */
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
      className="fixed inset-0 z-50 flex items-start justify-center scroll-slim overflow-y-auto bg-ink-900/40 p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onClick={(e) => e.stopPropagation()}
        className="my-auto flex w-full max-w-[660px] flex-col gap-6 rounded-2xl bg-surface p-6 sm:p-8"
      >
        <header className="flex items-center justify-between gap-4">
          {header ?? (
            <h2 className="font-display text-2xl font-semibold text-ink-700">
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

/** Edit — Figma 115:6758. A Just Grouv post only has its caption to edit. */
export function EditPostModal({
  post,
  onClose,
  onSaved,
}: {
  post: Post;
  onClose: () => void;
  onSaved: (patch: Pick<Post, "title" | "progress" | "body">) => void;
}) {
  const viewer = useViewer();
  const [doing, setDoing] = useState(post.title ?? "");
  const [honest, setHonest] = useState(post.body ?? "");
  const [stage, setStage] = useState<PostProgress | null>(post.progress);
  const [error, setError] = useState<string>();
  const [saving, startSaving] = useTransition();
  const isRoot = post.kind === "root";
  const [cover] = post.media;

  return (
    <Shell
      label="Edit post"
      onClose={onClose}
      header={
        <div className="flex items-center gap-6">
          <span className="relative size-12 shrink-0">
            <Avatar
              src={viewer.avatarUrl}
              name={viewer.firstName}
              sizes="48px"
              className="size-12 border-[1.5px] border-surface"
            />
            <span className="absolute right-0 bottom-0 size-3 rounded-full border border-surface bg-[#04802E]" />
          </span>
          <div className="flex flex-col gap-3">
            <span className="font-sans text-base font-bold text-ink-700">
              {viewer.firstName}
            </span>
            <span className="flex w-fit items-center gap-2 rounded-full bg-primary-50 px-3 py-1.5 font-sans text-sm font-semibold text-primary-600">
              {getChapter(post.chapterSlug)?.name ?? "Chapter"}
            </span>
          </div>
        </div>
      }
    >
      {cover && (
        <div className="relative h-[220px] w-full overflow-hidden rounded-lg bg-ivory-200 sm:h-[332px]">
          {cover.kind === "photo" ? (
            <Photo src={cover.src} alt="" fill unoptimized className="object-cover" />
          ) : (
            <Video
              src={withTrim(cover.src, cover.trimStart, cover.trimEnd)}
              controls
              playsInline
              className="absolute inset-0 size-full object-cover"
            />
          )}
        </div>
      )}

      <form
        className="flex flex-col gap-6"
        onSubmit={(e) => {
          e.preventDefault();
          setError(undefined);
          startSaving(async () => {
            const patch = {
              title: isRoot ? doing.trim() || null : null,
              progress: isRoot ? stage : null,
              body: honest.trim() || null,
            };
            const result = await updatePost(post.id, {
              title: patch.title ?? "",
              progress: patch.progress,
              body: patch.body ?? "",
            });
            if (result.error) setError(result.error);
            else onSaved(patch);
          });
        }}
      >
        {isRoot && (
          <>
            <label className="flex flex-col gap-1.5">
              <span className="font-sans text-sm font-medium text-ink-500">
                WHAT ARE YOU DOING RIGHT NOW?
              </span>
              <textarea
                value={doing}
                onChange={(e) => setDoing(e.target.value)}
                rows={3}
                maxLength={500}
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
                    key={option.value}
                    type="button"
                    aria-pressed={stage === option.value}
                    onClick={() => setStage(stage === option.value ? null : option.value)}
                    className={cn(
                      "rounded-full px-4 py-2 font-sans text-sm font-semibold transition-colors",
                      stage === option.value
                        ? "bg-primary-500 text-white"
                        : "bg-primary-50 text-primary-600 hover:bg-primary-100",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </fieldset>
          </>
        )}

        <label className="flex flex-col gap-1.5">
          <span className="font-sans text-sm font-medium text-ink-500">
            {isRoot ? "ONE HONEST THING ABOUT WHERE YOU ARE" : "CAPTION"}
          </span>
          <textarea
            value={honest}
            onChange={(e) => setHonest(e.target.value)}
            rows={4}
            maxLength={4000}
            className={FIELD}
          />
        </label>

        <FormError message={error} />

        <div className="flex items-center justify-end gap-8 border-t border-ink-50 pt-6">
          <Button variant="secondary" size="sm" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" type="submit" loading={saving}>
            Save changes
          </Button>
        </div>
      </form>
    </Shell>
  );
}

/** Report this — Figma 115:7248. Also reports a person from their profile. */
export function ReportPostModal({
  postId,
  targetType = "post",
  onClose,
  onReported,
}: {
  postId: string;
  targetType?: "post" | "profile";
  onClose: () => void;
  onReported: () => void;
}) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState("");
  const [error, setError] = useState<string>();
  const [sending, startSending] = useTransition();

  return (
    <Shell label="Report this" onClose={onClose}>
      <form
        className="flex flex-col gap-8"
        onSubmit={(e) => {
          e.preventDefault();
          if (!reason) return;
          setError(undefined);
          startSending(async () => {
            const result = await reportContent(targetType, postId, reason, details);
            if (result.error) setError(result.error);
            else onReported();
          });
        }}
      >
        <div className="flex flex-col gap-6">
          <fieldset className="flex flex-col gap-4">
            <legend className="font-sans text-sm font-medium text-ink-500">
              WHAT&rsquo;S WRONG WITH IT?
            </legend>
            <div className="flex flex-wrap items-center gap-4">
              {REPORT_REASONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={reason === option.value}
                  onClick={() => setReason(option.value)}
                  className={cn(
                    "rounded-full px-4 py-2 font-sans text-base font-medium transition-colors",
                    reason === option.value
                      ? "bg-primary-500 text-white"
                      : "bg-primary-50 text-primary-600 hover:bg-primary-100",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="flex flex-col gap-1.5">
            <span className="font-sans text-sm font-medium text-ink-500">
              ANYTHING ELSE WE SHOULD KNOW? (OPTIONAL)
            </span>
            <textarea
              rows={4}
              maxLength={2000}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className={cn(FIELD, "h-[131px]")}
            />
          </label>
        </div>

        <div className="flex flex-col gap-3 border-t border-ink-50 pt-6">
          <FormError message={error} />
          <Button size="sm" fullWidth type="submit" disabled={!reason} loading={sending}>
            Submit Report
          </Button>
        </div>
      </form>
    </Shell>
  );
}

/** "Are you sure you want to delete this post?" — Figma alert 115:7207. */
export function DeletePostModal({
  postId,
  onClose,
  onDeleted,
}: {
  postId: string;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [error, setError] = useState<string>();
  const [deleting, startDeleting] = useTransition();

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
            {error ??
              "This action can’t be undone. Your post and its comments will be permanently removed."}
          </p>
          <div className="flex gap-4 pt-1">
            <button
              type="button"
              disabled={deleting}
              onClick={() => {
                setError(undefined);
                startDeleting(async () => {
                  const result = await deletePost(postId);
                  if (result.error) setError(result.error);
                  else onDeleted();
                });
              }}
              className="rounded-full bg-destructive-60 px-4 py-2 font-ui text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {deleting ? "Deleting…" : "Delete"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-4 py-2 font-ui text-sm font-medium text-ink-400 transition-colors hover:bg-surface"
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
