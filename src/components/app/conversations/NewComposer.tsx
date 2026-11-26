"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { forgetConversations } from "@/components/app/conversations/ConversationList";
import { useAttachments } from "@/components/app/conversations/useAttachments";
import { MediaTiles } from "@/components/app/media/MediaTiles";
import { useToast } from "@/components/app/ToastProvider";
import { useViewer } from "@/components/app/ViewerProvider";
import { getChapter } from "@/lib/chapters";
import { cn } from "@/lib/cn";
import { Select } from "@/components/ui/Select";
import { CONVERSATIONS, getConversation, topicsFor, type Conversation } from "@/lib/conversations";
import { createPost } from "@/lib/post-actions";

type Format = Conversation | "regular";

const FORMATS: { value: Format; label: string }[] = [
  ...CONVERSATIONS.map((c) => ({ value: c.value as Format, label: c.label })),
  { value: "regular", label: "Regular" },
];

/**
 * "New conversation" (Phase 1 handoff): one composer. Pick a format only if
 * it helps, write, add photos or videos if you like, choose the Space and an
 * optional subhub, Publish.
 */
export function NewComposer({
  initialSpace,
  onClose: close,
}: {
  /** A Space page opens it in its own Space. */
  initialSpace?: string;
  onClose: () => void;
}) {
  const viewer = useViewer();
  const toast = useToast();
  const spaces = viewer.chapters.filter((c) => !c.pausedAt);
  const [format, setFormat] = useState<Format>("regular");
  const [text, setText] = useState("");
  const [space, setSpace] = useState(
    spaces.find((c) => c.slug === initialSpace)?.slug ?? spaces.find((c) => c.isPrimary)?.slug ?? spaces[0]?.slug ?? "",
  );
  const [subhub, setSubhub] = useState("");
  const [error, setError] = useState<string>();
  const [posting, startPosting] = useTransition();
  const box = useRef<HTMLTextAreaElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const media = useAttachments(viewer.id);
  const [dragging, setDragging] = useState(false);
  // Closing without publishing takes the uploads with it.
  const onClose = () => {
    media.discard();
    close();
  };

  useEffect(() => {
    box.current?.focus();
  }, []);

  const type = format === "regular" ? undefined : getConversation(format);
  const subhubs = topicsFor(space);

  const publish = () => {
    setError(undefined);
    startPosting(async () => {
      const result = await createPost({
        chapterSlug: space,
        kind: "root",
        title: "",
        progress: null,
        body: text,
        conversation: type?.value ?? null,
        topic: subhub || null,
        anonymous: false,
        audience: "everyone",
        mentions: [],
        media: media.forPost,
      }).catch((): { error?: string } => ({ error: "We couldn't publish that. Your words are still here. Try again." }));
      if (result.error) {
        setError(result.error);
        return;
      }
      forgetConversations();
      toast({ title: "Published", description: "Your conversation is on Home and in its Space." });
      close();
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-900/40 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-conversation"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
        }}
        onDragOver={(e) => {
          if (!e.dataTransfer.types.includes("Files")) return;
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          if (!e.dataTransfer.files.length) return;
          e.preventDefault();
          setDragging(false);
          media.add(Array.from(e.dataTransfer.files));
        }}
        className={cn(
          "flex w-full max-w-[560px] flex-col gap-4 rounded-2xl bg-surface p-5 sm:p-6",
          dragging && "ring-2 ring-primary-300",
        )}
      >
        <header className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <h2 id="new-conversation" className="font-sans text-lg font-semibold text-ink-800">
              New conversation
            </h2>
            <p className="font-sans text-sm text-ink-300">Pick a format only if it helps.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-m-1.5 rounded-full p-1.5 text-ink-400 hover:bg-ivory-200"
          >
            <svg viewBox="0 0 24 24" fill="none" className="size-5" aria-hidden="true">
              <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        {spaces.length === 0 ? (
          <p className="font-sans text-[15px] text-ink-500">
            Conversations live in a Space.{" "}
            <Link href="/spaces" onClick={onClose} className="font-semibold text-primary-600 hover:underline">
              Join a Space
            </Link>{" "}
            to start one.
          </p>
        ) : (
          <>
            <div role="radiogroup" aria-label="Format" className="flex flex-wrap gap-2">
              {FORMATS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  role="radio"
                  aria-checked={format === f.value}
                  onClick={() => setFormat(f.value)}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 font-sans text-sm font-semibold transition-colors",
                    format === f.value ? "bg-ink-800 text-white" : "bg-ivory-300 text-ink-500 hover:bg-ivory-400",
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <label className="sr-only" htmlFor="conversation-text">
              {type?.prompt ?? "What's on your mind?"}
            </label>
            <textarea
              ref={box}
              id="conversation-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              maxLength={4000}
              placeholder={type ? `${type.prompt} ${type.hint}.` : "What's on your mind?"}
              className="w-full resize-none rounded-xl border border-ink-50 bg-ivory-100 px-4 py-3 font-sans text-[16px] leading-relaxed text-ink-700 outline-none placeholder:text-ink-300 focus:border-primary-200 focus:shadow-[0px_0px_0px_4px_rgba(249,189,152,0.25)]"
            />

            <MediaTiles
              drafts={media.attachments}
              onRemove={media.remove}
              onRetry={media.retry}
              onMove={media.move}
              onCrop={media.crop}
              onTrim={media.trim}
            />

            <dl className="flex flex-col divide-y divide-ink-50 border-y border-ink-50">
              <div className="flex items-center justify-between gap-4 py-2.5">
                <dt>
                  <label htmlFor="conversation-space" className="font-sans text-sm font-medium text-ink-400">
                    Space
                  </label>
                </dt>
                <dd>
                  <Select
                    id="conversation-space"
                    value={space}
                    onChange={(next) => {
                      setSpace(next);
                      setSubhub("");
                    }}
                    options={spaces.map((c) => ({ value: c.slug, label: getChapter(c.slug)?.name ?? c.slug }))}
                    align="right"
                    className="rounded-full px-3 py-1.5 font-sans text-sm font-semibold text-ink-800 hover:bg-ivory-200"
                  />
                </dd>
              </div>
              {subhubs.length > 0 && (
                <div className="flex items-center justify-between gap-4 py-2.5">
                  <dt>
                    <label htmlFor="conversation-subhub" className="font-sans text-sm font-medium text-ink-400">
                      Subhub (optional)
                    </label>
                  </dt>
                  <dd>
                    <Select
                      id="conversation-subhub"
                      value={subhub}
                      onChange={setSubhub}
                      options={[{ value: "", label: "None" }, ...subhubs.map((t) => ({ value: t.slug, label: t.label }))]}
                      align="right"
                      className="rounded-full px-3 py-1.5 font-sans text-sm text-ink-700 hover:bg-ivory-200"
                    />
                  </dd>
                </div>
              )}
            </dl>

            {error && (
              <p role="alert" className="font-sans text-sm text-destructive-60">
                {error}
              </p>
            )}

            <footer className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => picker.current?.click()}
                className="flex items-center gap-2 rounded-full px-2 py-1.5 font-sans text-sm font-medium text-ink-500 transition-colors hover:bg-ivory-200 hover:text-ink-800"
              >
                <svg viewBox="0 0 20 20" fill="none" className="size-5" aria-hidden="true">
                  <rect x="2.5" y="4" width="15" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
                  <circle cx="7" cy="8.5" r="1.5" fill="currentColor" />
                  <path d="m4 15 4.5-4 3 2.5 2.5-2 2.5 2" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                </svg>
                Add a photo or video
              </button>
              <input
                ref={picker}
                type="file"
                accept="image/*,video/*"
                multiple
                hidden
                onChange={(e) => {
                  media.add(Array.from(e.target.files ?? []));
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={publish}
                disabled={(!text.trim() && media.forPost.length === 0) || !space || posting || media.busy}
                className="rounded-full bg-ink-800 px-5 py-2.5 font-sans text-sm font-semibold text-white transition-colors hover:bg-ink-700 disabled:bg-ink-50 disabled:text-ink-200"
              >
                {posting ? "Publishing…" : media.busy ? "Uploading…" : "Publish"}
              </button>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
