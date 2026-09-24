"use client";

import { useState } from "react";
import { ImageCropper } from "@/components/app/media/ImageCropper";
import { VideoTrimmer } from "@/components/app/media/VideoTrimmer";
import { clock, type MediaDraft } from "@/lib/media-draft";

/**
 * What's attached to a post, before it is posted: a thumbnail each, with the
 * order they'll appear in, and a way to crop a picture or trim a clip.
 */
export function MediaTiles({
  drafts,
  onRemove,
  onRetry,
  onMove,
  onCrop,
  onTrim,
}: {
  drafts: MediaDraft[];
  onRemove: (draft: MediaDraft) => void;
  onRetry: (draft: MediaDraft) => void;
  onMove: (draft: MediaDraft, direction: -1 | 1) => void;
  onCrop: (draft: MediaDraft, blob: Blob) => void;
  onTrim: (draft: MediaDraft, range: { start: number; end: number; duration: number }) => void;
}) {
  const [editing, setEditing] = useState<MediaDraft | null>(null);

  if (drafts.length === 0) return null;

  return (
    <>
      <ul className="flex flex-wrap gap-3">
        {drafts.map((draft, index) => (
          <li
            key={draft.id}
            className="relative size-28 overflow-hidden rounded-xl bg-ivory-200 shadow-[0px_1px_2px_0px_rgba(23,23,23,0.05)] sm:size-32"
          >
            {draft.kind === "photo" ? (
              /* eslint-disable-next-line @next/next/no-img-element -- a local object URL, never optimised */
              <img src={draft.previewUrl} alt="" className="size-full object-cover" />
            ) : (
              <video src={draft.previewUrl} preload="metadata" muted playsInline className="size-full object-cover" />
            )}

            {/* Uploading: a real progress bar. Failed: say so, and offer Retry. */}
            {draft.status === "uploading" && (
              <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-ink-900/40 px-3">
                <span className="font-sans text-xs font-semibold text-white tabular-nums">
                  {Math.round((draft.progress ?? 0) * 100)}%
                </span>
                <span
                  role="progressbar"
                  aria-label={`Uploading ${draft.name}`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round((draft.progress ?? 0) * 100)}
                  className="h-1.5 w-full overflow-hidden rounded-full bg-white/30"
                >
                  <span
                    className="block h-full rounded-full bg-white transition-[width] duration-200"
                    style={{ width: `${Math.max(4, Math.round((draft.progress ?? 0) * 100))}%` }}
                  />
                </span>
              </span>
            )}
            {draft.status === "failed" && (
              <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-destructive-60/85 px-2 text-center">
                <span className="font-sans text-xs font-medium text-white">Upload failed</span>
                {draft.file && (
                  <button
                    type="button"
                    onClick={() => onRetry(draft)}
                    className="rounded-full bg-white px-3 py-1 font-sans text-xs font-semibold text-destructive-60"
                  >
                    Retry
                  </button>
                )}
              </span>
            )}

            {draft.kind === "video" && draft.trimEnd != null && (
              <span className="absolute bottom-1 left-1 rounded-full bg-ink-900/70 px-2 py-0.5 font-sans text-[11px] text-white">
                {clock(draft.trimEnd - (draft.trimStart ?? 0))}
              </span>
            )}

            <div className="absolute inset-x-1 top-1 flex items-center gap-1">
              <button
                type="button"
                onClick={() => onMove(draft, -1)}
                disabled={index === 0}
                aria-label={`Move ${draft.name} earlier`}
                className="grid size-6 place-items-center rounded-full bg-ink-900/60 font-sans text-xs text-white disabled:opacity-30"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => onMove(draft, 1)}
                disabled={index === drafts.length - 1}
                aria-label={`Move ${draft.name} later`}
                className="grid size-6 place-items-center rounded-full bg-ink-900/60 font-sans text-xs text-white disabled:opacity-30"
              >
                ›
              </button>
              <button
                type="button"
                onClick={() => onRemove(draft)}
                aria-label={`Remove ${draft.name}`}
                className="ml-auto grid size-6 place-items-center rounded-full bg-ink-900/60 font-sans text-xs text-white hover:bg-destructive-60"
              >
                ✕
              </button>
            </div>

            {draft.status === "done" && (
            <button
              type="button"
              onClick={() => setEditing(draft)}
              className="absolute inset-x-1 bottom-1 rounded-full bg-surface/90 py-1 font-sans text-xs font-medium text-ink-600 transition-colors hover:bg-surface"
            >
              {draft.kind === "photo" ? "Crop" : "Trim"}
            </button>
            )}
          </li>
        ))}
      </ul>

      {editing?.kind === "photo" && (
        <ImageCropper
          file={editing}
          onCancel={() => setEditing(null)}
          onApply={(blob) => {
            onCrop(editing, blob);
            setEditing(null);
          }}
        />
      )}
      {editing?.kind === "video" && (
        <VideoTrimmer
          file={editing}
          onCancel={() => setEditing(null)}
          onApply={(range) => {
            onTrim(editing, range);
            setEditing(null);
          }}
        />
      )}
    </>
  );
}
