"use client";

import { useState } from "react";
import type { MediaDraft } from "@/lib/media-draft";

/**
 * The large preview of what's attached — Figma h07 (Root - Preview) and h14
 * (Just Grouv - Preview): one item at a time with arrows and dots, Just
 * Grouv's caption laid over the bottom, and a button to add more. Cropping,
 * trimming and reordering stay on the thumbnails beneath (MediaTiles).
 */
export function MediaPreview({
  drafts,
  caption,
  onAdd,
}: {
  drafts: MediaDraft[];
  /** Just Grouv: the caption as it will sit over the media. */
  caption?: string;
  onAdd: (files: File[]) => void;
}) {
  const [index, setIndex] = useState(0);
  const at = Math.min(index, drafts.length - 1);
  const current = drafts[at];
  if (!current) return null;

  return (
    <div className="relative h-[240px] w-full overflow-hidden rounded-2xl bg-ink-900 sm:h-[332px]">
      {current.kind === "photo" ? (
        /* eslint-disable-next-line @next/next/no-img-element -- a local object URL, never optimised */
        <img src={current.previewUrl} alt="" className="size-full object-cover" />
      ) : (
        <video src={current.previewUrl} muted playsInline controls className="size-full object-cover" />
      )}

      {drafts.length > 1 && (
        <>
          {at > 0 && (
            <ArrowButton side="left" label="Previous" onClick={() => setIndex(at - 1)} />
          )}
          {at < drafts.length - 1 && (
            <ArrowButton side="right" label="Next" onClick={() => setIndex(at + 1)} />
          )}
        </>
      )}

      {(caption?.trim() || drafts.length > 1) && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 bg-black/40 px-6 pt-3 pb-4 text-center">
          {drafts.length > 1 && (
            <span className="flex gap-1.5" aria-hidden="true">
              {drafts.map((d, i) => (
                <span key={d.id} className={i === at ? "size-1.5 rounded-full bg-white" : "size-1.5 rounded-full bg-white/50"} />
              ))}
            </span>
          )}
          {caption?.trim() && (
            <p className="line-clamp-2 font-sans text-base font-medium text-white">{caption}</p>
          )}
        </div>
      )}

      <label
        className="absolute right-4 bottom-4 grid size-10 cursor-pointer place-items-center rounded-full bg-surface text-ink-700 shadow-sm transition-colors hover:bg-ivory-200"
        title="Add photos or videos"
      >
        <span className="sr-only">Add photos or videos</span>
        <svg viewBox="0 0 16 16" fill="none" className="size-5" aria-hidden="true">
          <rect x="2" y="3.5" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
          <path d="m3 10.5 3-2.5 3 2.5 2-1.5 2 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
        </svg>
        <input
          type="file"
          accept="image/*,video/*"
          multiple
          className="sr-only"
          onChange={(e) => {
            onAdd(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
      </label>
    </div>
  );
}

function ArrowButton({ side, label, onClick }: { side: "left" | "right"; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`absolute top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-black/30 text-white transition-colors hover:bg-black/50 ${side === "left" ? "left-3" : "right-3"}`}
    >
      <svg viewBox="0 0 16 16" fill="none" className="size-5" aria-hidden="true">
        <path
          d={side === "left" ? "m10 4-4 4 4 4" : "m6 4 4 4-4 4"}
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
