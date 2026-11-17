"use client";

import { useEffect, useState, useTransition } from "react";
import { Avatar } from "@/components/app/Avatar";
import { FeatureGuide } from "@/components/app/FeatureGuide";
import { MentionInput, useMentionPicks, type MentionPicks } from "@/components/app/MentionInput";
import { PostingToMenu } from "@/components/app/PostMenu";
import { useToast } from "@/components/app/ToastProvider";
import { useViewer } from "@/components/app/ViewerProvider";
import { FormError } from "@/components/auth/FormError";
import { Button } from "@/components/ui/Button";
import { createPost } from "@/lib/post-actions";
import { getChapter } from "@/lib/chapters";
import { CONVERSATIONS, getConversation, topicsFor, type Conversation } from "@/lib/conversations";
import { cn } from "@/lib/cn";
import { MEDIA_LIMITS, PROGRESS, type PostProgress } from "@/lib/posts";
import { MediaPreview } from "@/components/app/media/MediaPreview";
import { MediaTiles } from "@/components/app/media/MediaTiles";
import { clearDraft as forgetDraft, draftHasContent, readDraft, writeDraft, type ComposerDraft } from "@/lib/composer-draft";
import type { MediaDraft } from "@/lib/media-draft";
import { createClient } from "@/lib/supabase/client";
import { mediaExtension, mediaSize, uploadWithProgress } from "@/lib/upload";

/**
 * Post composer — Figma frame 100:1206 (660px card, 32px padding, 16px radius).
 *
 * "Root a thought" (100:1206) asks three prompts with a row of progress
 * badges and submits with "Root this". "Just Grouv" (110:3891) is a different
 * form entirely: two upload tiles, a caption, and "Grouv it".
 *
 * Files upload to Storage as soon as they're picked, so posting is quick and
 * a failed upload shows before the post is written ("Uploading… 62%", h05).
 *
 * Conversation types (2026-11-09): "Root a thought" can optionally say
 * what kind of conversation it starts (Unspoken, Unfiltered or Unfinished)
 * and a topic inside the Space. The prompts follow the type; with none
 * picked the card is exactly as Figma draws it.
 *
 * Every post is public (2026-11-16): there's no "Who can see this" choice.
 * PRD §6 additions: a large preview of attached media with the caption over it
 * (h07/h14); and a draft that's kept in this browser and can be resumed or
 * discarded. A failed upload or post keeps the whole draft for Retry.
 */
const MODES = ["Root a thought", "Just Grouv"] as const;




export function Composer({
  onClose,
  initialMode = "root",
}: {
  onClose?: () => void;
  /** Which tab it opens on (Home's "Just Grouv" shortcut opens the second). */
  initialMode?: "root" | "grouv";
} = {}) {
  const viewer = useViewer();
  const toast = useToast();

  const [mode, setMode] = useState<(typeof MODES)[number]>(initialMode === "grouv" ? MODES[1] : MODES[0]);
  const [stage, setStage] = useState<PostProgress | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [topic, setTopic] = useState<string | null>(null);
  const [chapter, setChapter] = useState(viewer.chapters[0]?.slug ?? "");
  const [chapterMenuOpen, setChapterMenuOpen] = useState(false);
  // "Where are you in it?" stays one link until it is wanted.
  const [stageOpen, setStageOpen] = useState(false);
  const [doing, setDoing] = useState("");
  const [honest, setHonest] = useState("");
  const [caption, setCaption] = useState("");
  const [attachments, setAttachments] = useState<MediaDraft[]>([]);
  const [error, setError] = useState<string>();
  const [posting, startPosting] = useTransition();
  // Every post is public: it reaches everyone on Grouv as soon as it's
  // posted, and the feed's ranking decides who sees it first.
  const audience = "everyone" as const;
  const audienceIds: string[] = [];
  const anonymous = false;
  const openGrouv = false;
  // A draft from an earlier visit, offered until it's resumed or discarded.
  const [savedDraft, setSavedDraft] = useState<ComposerDraft | null>(null);
  // People tagged with @ in the words; checked again by the database.
  const picks = useMentionPicks();

  const uploading = attachments.some((a) => a.status === "uploading");
  const uploadingNow = attachments.filter((a) => a.status === "uploading");
  const uploadPercent = uploadingNow.length
    ? Math.round((uploadingNow.reduce((sum, a) => sum + (a.progress ?? 0), 0) / uploadingNow.length) * 100)
    : null;

  const currentDraft = (): ComposerDraft => ({
    mode: mode === MODES[0] ? "root" : "grouv",
    chapter,
    stage,
    anonymous,
    doing,
    honest,
    caption,
    audience,
    audienceIds,
    openGrouv,
    conversation,
    topic,
    media: attachments.flatMap((a) =>
      a.path && a.status === "done"
        ? [
            {
              path: a.path,
              kind: a.kind,
              name: a.name,
              width: a.width,
              height: a.height,
              trimStart: a.trimStart,
              trimEnd: a.trimEnd,
              duration: a.duration,
            },
          ]
        : [],
    ),
    savedAt: new Date().toISOString(),
  });

  // Look for a saved draft once (storage isn't there on the server render).
  useEffect(() => {
    let live = true;
    void Promise.resolve().then(() => {
      if (live) setSavedDraft(readDraft(viewer.id));
    });
    return () => {
      live = false;
    };
  }, [viewer.id]);

  // Keep the draft as it's written, a moment after typing stops. An offered
  // draft isn't overwritten until it's resumed or discarded.
  useEffect(() => {
    if (savedDraft) return;
    const timer = window.setTimeout(() => {
      const draft = currentDraft();
      if (draftHasContent(draft)) writeDraft(viewer.id, draft);
    }, 400);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- currentDraft reads exactly these
  }, [mode, chapter, stage, conversation, topic, doing, honest, caption, attachments, savedDraft, viewer.id]);

  /** "Resume draft": fields come back as they were, media from Storage. */
  const resumeDraft = async () => {
    const draft = savedDraft;
    if (!draft) return;
    setSavedDraft(null);
    setMode(draft.mode === "root" ? MODES[0] : MODES[1]);
    if (viewer.chapters.some((c) => c.slug === draft.chapter)) setChapter(draft.chapter);
    setStage(draft.stage);
    setConversation(draft.conversation ?? null);
    setTopic(draft.topic ?? null);
    setDoing(draft.doing);
    setHonest(draft.honest);
    setCaption(draft.caption);
    // Older drafts may name a narrower audience; every post is public now.
    if (draft.media.length === 0) return;
    const { data } = await createClient()
      .storage.from("media")
      .createSignedUrls(
        draft.media.map((m) => m.path),
        60 * 60,
      );
    const urls = new Map((data ?? []).flatMap((d) => (d.path && d.signedUrl ? [[d.path, d.signedUrl] as const] : [])));
    setAttachments(
      draft.media.flatMap((m) => {
        const url = urls.get(m.path);
        return url ? [{ ...m, id: crypto.randomUUID(), status: "done" as const, previewUrl: url }] : [];
      }),
    );
  };

  /** "Discard": the saved draft and its uploads go. */
  const discardSavedDraft = () => {
    const paths = savedDraft?.media.map((m) => m.path) ?? [];
    if (paths.length) void createClient().storage.from("media").remove(paths);
    forgetDraft(viewer.id);
    setSavedDraft(null);
  };

  const clearDraft = () => {
    setMode(MODES[0]);
    setStage(null);
    setStageOpen(false);
    setConversation(null);
    setTopic(null);
    setDoing("");
    setHonest("");
    setCaption("");
    setAttachments([]);
    setChapterMenuOpen(false);
    setError(undefined);
    forgetDraft(viewer.id);
  };

  /**
   * The inline card's × discards the draft, as it always has. The composer
   * sheet's × keeps it: "Draft saved", to resume next time.
   */
  const close = () => {
    const draft = currentDraft();
    if (onClose && draftHasContent(draft) && !uploading) {
      writeDraft(viewer.id, draft);
      toast({ title: "Draft saved", description: "Pick up where you left off next time you open the composer." });
      onClose();
      return;
    }
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

    for (const file of accepted) {
      const id = crypto.randomUUID();
      setAttachments((prev) => [
        ...prev,
        { id, name: file.name, kind, status: "uploading", progress: 0, file, previewUrl: URL.createObjectURL(file) },
      ]);
      void measure(id, file, kind);
      void upload(id, file, kind);
    }
  };

  /** Records the pixel size, so the post holds its shape while it loads. */
  const measure = async (id: string, file: Blob, kind: "photo" | "video") => {
    const size = await mediaSize(file, kind);
    if (size) setAttachments((prev) => prev.map((a) => (a.id === id ? { ...a, ...size } : a)));
  };

  /** A failed upload goes again with the same file. */
  const retry = (draft: MediaDraft) => {
    if (!draft.file) return;
    setAttachments((prev) => prev.map((a) => (a.id === draft.id ? { ...a, status: "uploading", progress: 0 } : a)));
    void upload(draft.id, draft.file, draft.kind, draft.name);
  };

  /** Drag-and-drop or paste: photos and videos, sorted into their kinds. */
  const attachAny = (files: File[]) => {
    const photos = files.filter((f) => f.type.startsWith("image/"));
    const videos = files.filter((f) => f.type.startsWith("video/"));
    if (photos.length === 0 && videos.length === 0) {
      if (files.length) toast({ title: "Only photos and videos can go in a post", tone: "danger" });
      return;
    }
    if (photos.length) attach(photos, "photo");
    if (videos.length) attach(videos, "video");
  };
  const [dragging, setDragging] = useState(false);

  /** Puts one file in the bucket and marks the draft done, or failed. */
  const upload = async (id: string, file: Blob, kind: "photo" | "video", name?: string) => {
    // The type is the truth: a cropped picture comes back as a JPEG whatever
    // the file was called when it was picked.
    // Only extensions createPost accepts (see lib/media-path.ts).
    const extension = mediaExtension(file, name) ?? (kind === "photo" ? "jpg" : "mp4");
    const path = `${viewer.id}/${crypto.randomUUID()}.${extension}`;
    const result = await uploadWithProgress("media", path, file, (progress) =>
      setAttachments((prev) => prev.map((a) => (a.id === id ? { ...a, progress } : a))),
    );
    const uploadError = "error" in result ? result.error : null;
    setAttachments((prev) =>
      prev.map((a) => (a.id === id ? (uploadError ? { ...a, status: "failed" } : { ...a, status: "done", path }) : a)),
    );
    return uploadError ? null : path;
  };

  /** A cropped picture replaces the one already in the bucket. */
  const applyCrop = (draft: MediaDraft, blob: Blob) => {
    const previous = draft.path;
    URL.revokeObjectURL(draft.previewUrl);
    setAttachments((prev) =>
      prev.map((a) =>
        a.id === draft.id
          ? { ...a, status: "uploading", progress: 0, file: blob, path: undefined, previewUrl: URL.createObjectURL(blob) }
          : a,
      ),
    );
    void measure(draft.id, blob, "photo");
    void upload(draft.id, blob, "photo", draft.name).then(() => {
      if (previous) void createClient().storage.from("media").remove([previous]);
    });
  };

  /** Trimming only records the range; the file is already uploaded. */
  const applyTrim = (draft: MediaDraft, range: { start: number; end: number; duration: number }) => {
    setAttachments((prev) =>
      prev.map((a) =>
        a.id === draft.id ? { ...a, trimStart: range.start, trimEnd: range.end, duration: range.duration } : a,
      ),
    );
  };

  const move = (draft: MediaDraft, direction: -1 | 1) => {
    setAttachments((prev) => {
      const index = prev.findIndex((a) => a.id === draft.id);
      const next = index + direction;
      if (index < 0 || next < 0 || next >= prev.length) return prev;
      const copy = [...prev];
      [copy[index], copy[next]] = [copy[next], copy[index]];
      return copy;
    });
  };

  const detach = (attachment: MediaDraft) => {
    URL.revokeObjectURL(attachment.previewUrl);
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
        conversation: isRoot ? conversation : null,
        topic: isRoot ? topic : null,
        anonymous,
        openGrove: openGrouv,
        audience,
        audienceIds,
        mentions: picks.idsIn(isRoot ? honest : caption),
        media: attachments.flatMap((a) =>
          a.path
            ? [{ path: a.path, kind: a.kind, trimStart: a.trimStart, trimEnd: a.trimEnd, width: a.width, height: a.height }]
            : [],
        ),
      }).catch((): { error?: string } => ({ error: "We couldn't post that. Your draft is kept — try again." }));
      if (result.error) {
        // Everything stays as written, so trying again is one tap.
        setError(result.error);
        return;
      }
      // Figma 599:23020 / 599:23021.
      toast({
        title: isRoot ? "Post rooted." : "Post Grouved.",
        description: "Everyone on Grouv can see this post.",
      });
      clearDraft();
      onClose?.();
    });
  };

  const type = getConversation(conversation);
  const topics = topicsFor(chapter);
  // One of the type's examples as the placeholder, changing day to day.
  const exampleIndex = new Date().getDate();

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

  const attachmentRow = (
    <MediaTiles
      drafts={attachments}
      onRemove={detach}
      onRetry={retry}
      onMove={move}
      onCrop={applyCrop}
      onTrim={applyTrim}
    />
  );

  const submitDisabled =
    uploading ||
    attachments.some((a) => a.status === "failed");

  return (
    <article
      className={cn(
        "relative flex flex-col gap-5 rounded-2xl bg-surface p-5 lg:p-6",
        dragging && "ring-2 ring-primary-400 ring-offset-2 ring-offset-ivory-100",
      )}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
      }}
      onDrop={(e) => {
        if (!e.dataTransfer.files.length) return;
        e.preventDefault();
        setDragging(false);
        attachAny(Array.from(e.dataTransfer.files));
      }}
      onPaste={(e) => {
        const files = Array.from(e.clipboardData.files);
        if (files.length === 0) return;
        e.preventDefault();
        attachAny(files);
      }}
    >
      {dragging && (
        <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center rounded-2xl bg-primary-50/90">
          <span className="font-sans text-base font-semibold text-primary-700">Drop photos or videos to add them</span>
        </div>
      )}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="relative size-10 shrink-0">
            <Avatar
              src={viewer.avatarUrl}
              name={viewer.firstName}
              userId={viewer.id}
              sizes="40px"
              className="size-10 border-[1.5px] border-surface"
            />
            <span className="absolute right-0 bottom-0 size-3 rounded-full border border-surface bg-[#04802E]" />
          </span>

          <div className="flex flex-col gap-1">
            <span className="font-sans text-sm font-semibold text-ink-700">
              {viewer.firstName}
            </span>
            {/* Figma 110:3828 — this chip opens the "POSTING TO" chapter menu. */}
            <div className="relative w-fit">
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={chapterMenuOpen}
                onClick={() => setChapterMenuOpen((open) => !open)}
                className="flex w-fit items-center gap-1.5 rounded-full bg-primary-50 px-2.5 py-1 font-sans text-xs font-semibold text-primary-600"
              >
                <BagIcon className="size-4" />
                {getChapter(chapter)?.name ?? "Choose a chapter"}
                <CaretDownIcon className="size-4" />
              </button>
              {chapterMenuOpen && (
                <PostingToMenu
                  value={chapter}
                  onSelect={(next) => {
                    // Each Space has its own topics.
                    if (next !== chapter) setTopic(null);
                    setChapter(next);
                  }}
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
          className="rounded p-2 text-ink-800 transition-colors hover:bg-ivory-200"
        >
          <CloseIcon className="size-5" />
        </button>
      </header>

      <div className="flex items-center gap-2">
        <div role="tablist" className="flex flex-1">
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
        {/* Opens by itself the first time they switch to Just Grouv. */}
        <FeatureGuide id="just-grouv" auto={mode === "Just Grouv"} afterAction />
      </div>

      {savedDraft && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-primary-50 px-4 py-3">
          <span className="font-sans text-sm text-primary-800">You have a saved draft.</span>
          <span className="flex gap-2">
            <Button size="sm" variant="tertiary" onClick={discardSavedDraft}>
              Discard
            </Button>
            <Button size="sm" variant="secondary" onClick={() => void resumeDraft()}>
              Resume draft
            </Button>
          </span>
        </div>
      )}

      {/* Root - Uploading (Figma h05): one bar for everything in flight. */}
      {uploadPercent !== null && (
        <div className="flex flex-col gap-2" aria-live="polite">
          <span
            role="progressbar"
            aria-label="Uploading"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={uploadPercent}
            className="h-2 w-full overflow-hidden rounded-full bg-primary-50"
          >
            <span
              className="block h-full rounded-full bg-primary-600 transition-[width] motion-reduce:transition-none"
              style={{ width: `${uploadPercent}%` }}
            />
          </span>
          <span className="font-sans text-sm text-ink-500 tabular-nums">Uploading… {uploadPercent}%</span>
        </div>
      )}

      {mode === MODES[1] ? (
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-6">
            {attachments.length > 0 && (
              <MediaPreview drafts={attachments} caption={caption} onAdd={attachAny} />
            )}
            {/* One tile for both: photos and videos sort themselves. */}
            <div className={cn("flex", attachments.length > 0 && "hidden")}>
              <UploadTile
                title="Add photos or videos"
                body="Tap to choose, or drag them here"
                accept="image/*,video/*"
                icon={<ImagesIcon className="size-6" />}
                onPick={attachAny}
              />
            </div>

            {attachmentRow}

            <div className="rounded-xl border border-ink-50 bg-ivory-100 focus-within:border-primary-200 focus-within:shadow-[0px_0px_0px_4px_rgba(249,189,152,0.25)]">
              <Field
                bare
                label="Caption"
                name="caption"
                rows={4}
                value={caption}
                onChange={setCaption}
                maxLength={4000}
                mention={{ chapterSlug: chapter, picks }}
                placeholder="Add a caption (optional)"
                className="text-[15px]"
              />
            </div>
          </div>

          <FormError message={error} />

          <div className="flex items-center justify-end gap-4 border-t border-ink-50 pt-6">
            <Button size="sm" onClick={submit} loading={posting} disabled={submitDisabled}>
              {error ? "Try again" : "Grouv it"}
            </Button>
          </div>
        </div>
      ) : (
      <>
      {/* Root - Preview (Figma h07): attached media leads the card. */}
      {attachments.length > 0 && <MediaPreview drafts={attachments} onAdd={attachAny} />}
      {/* One writing box (headline + the honest part), like Reddit or X;
          the extras below it are optional. */}
      <div className="flex flex-col rounded-xl border border-ink-50 bg-ivory-100 focus-within:border-primary-200 focus-within:shadow-[0px_0px_0px_4px_rgba(249,189,152,0.25)]">
        <Field
          bare
          label={type ? type.prompt : "What are you doing right now?"}
          name="doing"
          rows={2}
          value={doing}
          onChange={setDoing}
          maxLength={500}
          placeholder={type ? type.prompt : "What are you doing right now?"}
          className="text-[17px] font-semibold text-ink-700"
        />
        <hr className="mx-3.5 border-ink-50" />
        <Field
          bare
          label={type ? type.detailPrompt : "One honest thing about where you are"}
          name="honest"
          rows={3}
          value={honest}
          onChange={setHonest}
          maxLength={4000}
          mention={{ chapterSlug: chapter, picks }}
          placeholder={type ? type.detailPrompt : "One honest thing about where you are"}
          className="text-[15px]"
        />
      </div>

      <div className="flex flex-col gap-4">
        <fieldset className="flex flex-col gap-2">
          <legend className="pb-1 font-sans text-sm text-ink-400">Kind of conversation (optional)</legend>
          <div className="flex flex-wrap gap-2">
            {CONVERSATIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={conversation === option.value}
                onClick={() => {
                  const next = conversation === option.value ? null : option.value;
                  setConversation(next);
                  if (!next) setTopic(null);
                }}
                className={cn(
                  "rounded-full px-3.5 py-1.5 font-sans text-sm font-semibold transition-colors",
                  conversation === option.value
                    ? "bg-primary-500 text-white"
                    : "bg-primary-50 text-primary-600 hover:bg-primary-100",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          {type && (
            // The example changes by day; the server's day can differ from the browser's.
            <p className="font-sans text-sm text-ink-300" suppressHydrationWarning>
              {type.hint}. For example: “{type.examples[exampleIndex % type.examples.length]}”
            </p>
          )}
        </fieldset>

        {type && topics.length > 0 && (
          <fieldset className="flex flex-col gap-2">
            <legend className="pb-1 font-sans text-sm text-ink-400">Topic (optional)</legend>
            <div className="flex flex-wrap gap-2">
              {topics.map((option) => (
                <button
                  key={option.slug}
                  type="button"
                  aria-pressed={topic === option.slug}
                  onClick={() => setTopic(topic === option.slug ? null : option.slug)}
                  className={cn(
                    "rounded-full px-3 py-1.5 font-sans text-sm transition-colors",
                    topic === option.slug
                      ? "bg-ink-700 text-ivory-100"
                      : "bg-ivory-400 text-ink-500 hover:bg-ivory-500",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        {(!type || type.value === "unfinished") && !stageOpen && !stage && (
          <button
            type="button"
            onClick={() => setStageOpen(true)}
            className="self-start font-sans text-sm font-medium text-primary-600 hover:underline"
          >
            + Add where you are in it
          </button>
        )}

        {(!type || type.value === "unfinished") && (stageOpen || stage) && (
          <fieldset className="flex flex-col gap-2">
            <legend className="pb-1 font-sans text-sm text-ink-400">Where are you in it? (optional)</legend>
            <div className="flex flex-wrap gap-2">
              {PROGRESS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={stage === option.value}
                  onClick={() => setStage(stage === option.value ? null : option.value)}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 font-sans text-sm font-semibold transition-colors",
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
        )}
      </div>

      {attachmentRow}
      <FormError message={error} />

      <footer className="flex items-center justify-between gap-4 border-t border-ink-50 pt-4">
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
          {error ? "Try again" : "Root this"}
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
  mention,
  placeholder,
  bare = false,
  className,
}: {
  label: string;
  name: string;
  rows: number;
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  /** Just Grouv labels its caption in sentence case, not the prompts' caps. */
  plainLabel?: boolean;
  /** Offers people to tag with @: the circle and people holding this Space. */
  mention?: { chapterSlug: string; picks: MentionPicks };
  placeholder?: string;
  /** Inside the writing box: no label on screen (the placeholder says it), no frame. */
  bare?: boolean;
  className?: string;
}) {
  const fieldClass = cn(
    bare
      ? "w-full resize-none bg-transparent px-3.5 py-3 font-sans text-base text-ink-500 outline-none placeholder:font-normal placeholder:text-ink-300"
      : "w-full resize-y rounded-lg bg-ivory-100 px-3.5 py-2.5 font-sans text-base text-ink-500 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] outline-none placeholder:text-ink-200 focus:shadow-[0px_0px_0px_4px_rgba(249,189,152,0.25)]",
    className,
  );
  return (
    <div className={cn("flex flex-col", !bare && "gap-1.5")}>
      <label
        htmlFor={name}
        className={cn(
          bare ? "sr-only" : "font-sans text-sm font-medium text-ink-500",
          !bare && !plainLabel && "tracking-wide uppercase",
        )}
      >
        {label}
      </label>
      {mention ? (
        <MentionInput
          id={name}
          name={name}
          rows={rows}
          value={value}
          maxLength={maxLength}
          onChange={onChange}
          context={{ kind: "space", chapterSlug: mention.chapterSlug }}
          picks={mention.picks}
          placeholder={placeholder}
          className={fieldClass}
        />
      ) : (
        <textarea
          id={name}
          name={name}
          rows={rows}
          value={value}
          maxLength={maxLength}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          // The example changes by day; the server's day can differ from the browser's.
          suppressHydrationWarning
          className={fieldClass}
        />
      )}
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

