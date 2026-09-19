"use client";

import { useState, useTransition } from "react";
import { Avatar } from "@/components/app/Avatar";
import { PostingToMenu } from "@/components/app/PostMenu";
import { useToast } from "@/components/app/ToastProvider";
import { useViewer } from "@/components/app/ViewerProvider";
import { FormError } from "@/components/auth/FormError";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { createPost } from "@/lib/post-actions";
import { getChapter } from "@/lib/chapters";
import { cn } from "@/lib/cn";
import { MEDIA_LIMITS, PROGRESS, type PostProgress } from "@/lib/posts";
import { createClient } from "@/lib/supabase/client";

/**
 * Post composer — Figma frame 100:1206 (660px card, 32px padding, 16px radius).
 *
 * "Root a thought" (100:1206) asks three prompts with a row of progress
 * badges and submits with "Root this". "Just Grouv" (110:3891) is a different
 * form entirely: two upload tiles, a caption, and "Grouv it".
 *
 * Files upload to Storage as soon as they're picked, so posting is quick and
 * a failed upload shows before the post is written.
 */
const MODES = ["Root a thought", "Just Grouv"] as const;

interface Attachment {
  id: string;
  name: string;
  kind: "photo" | "video";
  status: "uploading" | "done" | "failed";
  path?: string;
}

export function Composer({ onClose }: { onClose?: () => void } = {}) {
  const viewer = useViewer();
  const toast = useToast();

  const [mode, setMode] = useState<(typeof MODES)[number]>(MODES[0]);
  const [stage, setStage] = useState<PostProgress | null>(null);
  const [anonymous, setAnonymous] = useState(false);
  const [chapter, setChapter] = useState(viewer.chapters[0]?.slug ?? "");
  const [chapterMenuOpen, setChapterMenuOpen] = useState(false);
  const [doing, setDoing] = useState("");
  const [honest, setHonest] = useState("");
  const [caption, setCaption] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [error, setError] = useState<string>();
  const [posting, startPosting] = useTransition();

  const uploading = attachments.some((a) => a.status === "uploading");

  const clearDraft = () => {
    setMode(MODES[0]);
    setStage(null);
    setAnonymous(false);
    setDoing("");
    setHonest("");
    setCaption("");
    setAttachments([]);
    setChapterMenuOpen(false);
    setError(undefined);
  };

  /** The close button clears the draft rather than doing nothing. */
  const close = () => {
    const uploaded = attachments.flatMap((a) => (a.path ? [a.path] : []));
    if (uploaded.length) void createClient().storage.from("media").remove(uploaded);
    clearDraft();
    onClose?.();
  };

  const attach = (files: File[], kind: "photo" | "video") => {
    const room = MEDIA_LIMITS.maxFiles - attachments.length;
    if (room <= 0) {
      toast({ title: `You can attach up to ${MEDIA_LIMITS.maxFiles} files`, tone: "danger" });
      return;
    }
    const limit = kind === "photo" ? MEDIA_LIMITS.photoBytes : MEDIA_LIMITS.videoBytes;
    const accepted = files.slice(0, room).filter((file) => {
      if (file.size <= limit) return true;
      toast({
        title: `${file.name} is over ${kind === "photo" ? "10MB" : "100MB"}`,
        tone: "danger",
      });
      return false;
    });

    const supabase = createClient();
    for (const file of accepted) {
      const id = crypto.randomUUID();
      const extension = (file.name.split(".").pop() ?? "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5)
        || (kind === "photo" ? "jpg" : "mp4");
      const path = `${viewer.id}/${id}.${extension}`;

      setAttachments((prev) => [...prev, { id, name: file.name, kind, status: "uploading" }]);
      supabase.storage
        .from("media")
        .upload(path, file, { contentType: file.type })
        .then(({ error: uploadError }) => {
          setAttachments((prev) =>
            prev.map((a) =>
              a.id === id
                ? uploadError
                  ? { ...a, status: "failed" }
                  : { ...a, status: "done", path }
                : a,
            ),
          );
        });
    }
  };

  const detach = (attachment: Attachment) => {
    setAttachments((prev) => prev.filter((a) => a.id !== attachment.id));
    if (attachment.path) void createClient().storage.from("media").remove([attachment.path]);
  };

  const submit = () => {
    setError(undefined);
    const isRoot = mode === MODES[0];
    startPosting(async () => {
      const result = await createPost({
        chapterSlug: chapter,
        kind: isRoot ? "root" : "grouv",
        title: isRoot ? doing : "",
        progress: isRoot ? stage : null,
        body: isRoot ? honest : caption,
        anonymous,
        media: attachments.flatMap((a) => (a.path ? [{ path: a.path, kind: a.kind }] : [])),
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      toast({ title: `Posted to ${getChapter(chapter)?.name ?? "your space"}` });
      clearDraft();
      onClose?.();
    });
  };

  if (viewer.chapters.length === 0) {
    return (
      <article className="flex flex-col items-start gap-3 rounded-2xl bg-surface p-6 lg:p-8">
        <p className="font-sans text-base text-ink-500">
          Posts live inside a chapter. Open one to start rooting thoughts.
        </p>
        <Button size="sm" href="/spaces">
          Go to My Spaces
        </Button>
      </article>
    );
  }

  const attachmentRow = attachments.length > 0 && (
    <ul className="flex flex-wrap gap-2">
      {attachments.map((a) => (
        <li
          key={a.id}
          className={cn(
            "flex max-w-full items-center gap-2 rounded-full px-3 py-1 font-sans text-xs",
            a.status === "failed" ? "bg-destructive-5 text-destructive-60" : "bg-ivory-400 text-ink-500",
          )}
        >
          <span className="truncate">
            {a.status === "uploading" ? "Uploading " : a.status === "failed" ? "Failed: " : ""}
            {a.name}
          </span>
          <button
            type="button"
            onClick={() => detach(a)}
            aria-label={`Remove ${a.name}`}
            className="shrink-0"
          >
            <CloseIcon className="size-3" />
          </button>
        </li>
      ))}
    </ul>
  );

  const submitDisabled = uploading || attachments.some((a) => a.status === "failed");

  return (
    <article className="flex flex-col gap-6 rounded-2xl bg-surface p-6 lg:p-8">
      <header className="flex items-center justify-between">
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
                {getChapter(chapter)?.name ?? "Choose a chapter"}
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
          onClick={close}
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

      {mode === MODES[1] ? (
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-6">
            {/* Frame 112:6433 — two upload tiles side by side. */}
            <div className="flex flex-col gap-6 sm:flex-row">
              <UploadTile
                title="Photo"
                body="Upload a photo"
                accept="image/*"
                icon={<ImagesIcon className="size-6" />}
                onPick={(files) => attach(files, "photo")}
              />
              <UploadTile
                title="Video"
                body="Upload a video"
                accept="video/*"
                icon={<VideoIcon className="size-6" />}
                onPick={(files) => attach(files, "video")}
              />
            </div>

            {attachmentRow}

            <Field
              label="Caption"
              name="caption"
              rows={4}
              value={caption}
              onChange={setCaption}
              maxLength={4000}
              plainLabel
            />
          </div>

          <FormError message={error} />

          <div className="flex items-center justify-between gap-4 border-t border-ink-50 pt-6">
            <Checkbox
              label="Post anonymously"
              checked={anonymous}
              onChange={(e) => setAnonymous(e.target.checked)}
            />
            <Button size="sm" onClick={submit} loading={posting} disabled={submitDisabled}>
              Grouv it
            </Button>
          </div>
        </div>
      ) : (
      <>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-6">
          <Field
            label="What are you doing right now?"
            name="doing"
            rows={2}
            value={doing}
            onChange={setDoing}
            maxLength={500}
          />

          <fieldset className="flex flex-col gap-4">
            <legend className="font-sans text-sm font-medium tracking-wide text-ink-500 uppercase">
              Where are you in it? · Optional
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

          <Field
            label="One honest thing about where you are"
            name="honest"
            rows={3}
            value={honest}
            onChange={setHonest}
            maxLength={4000}
          />
        </div>

        <Checkbox
          label="Post anonymously"
          checked={anonymous}
          onChange={(e) => setAnonymous(e.target.checked)}
        />
      </div>

      {attachmentRow}
      <FormError message={error} />

      <footer className="flex items-center justify-between gap-4 border-t border-ink-50 pt-6">
        <div className="flex items-center gap-3">
          <MediaChip
            icon={<ImagesIcon className="size-4" />}
            label="Photo"
            accept="image/*"
            onPick={(files) => attach(files, "photo")}
          />
          <MediaChip
            icon={<VideoIcon className="size-4" />}
            label="Video"
            accept="video/*"
            onPick={(files) => attach(files, "video")}
          />
        </div>
        <Button size="sm" onClick={submit} loading={posting} disabled={submitDisabled}>
          Root this
        </Button>
      </footer>
      </>
      )}
    </article>
  );
}

/** "upload: drag upload" (115:6438) — an ivory tile per media type. */
function UploadTile({
  title,
  body,
  accept,
  icon,
  onPick,
}: {
  title: string;
  body: string;
  accept: string;
  icon: React.ReactNode;
  onPick: (files: File[]) => void;
}) {
  // `relative` keeps the sr-only input from resolving against the initial
  // containing block and stretching the page.
  return (
    <label className="relative flex flex-1 cursor-pointer flex-col items-center justify-center gap-3 rounded-lg bg-ivory-500 p-6 text-center transition-colors hover:bg-ivory-600">
      <span className="grid size-11 place-items-center rounded-lg bg-primary-100 text-primary-600">
        {icon}
      </span>
      <span className="flex flex-col gap-1">
        <span className="font-sans text-sm font-semibold text-ink-500">
          {title}
        </span>
        <span className="font-sans text-sm text-ink-400">{body}</span>
      </span>
      <input
        type="file"
        accept={accept}
        multiple
        className="sr-only"
        onChange={(e) => {
          onPick(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />
    </label>
  );
}

function Field({
  label,
  name,
  rows,
  value,
  onChange,
  maxLength,
  plainLabel = false,
}: {
  label: string;
  name: string;
  rows: number;
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  /** Just Grouv labels its caption in sentence case, not the prompts' caps. */
  plainLabel?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={name}
        className={cn(
          "font-sans text-sm font-medium text-ink-500",
          !plainLabel && "tracking-wide uppercase",
        )}
      >
        {label}
      </label>
      <textarea
        id={name}
        name={name}
        rows={rows}
        value={value}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
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
  onPick: (files: File[]) => void;
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
        onChange={(e) => {
          onPick(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
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
