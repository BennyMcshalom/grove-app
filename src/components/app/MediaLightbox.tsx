"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { withTrim } from "@/lib/media-draft";
import type { Post } from "@/lib/posts";
import { cn } from "@/lib/cn";

/**
 * A post's media at full size, uncropped, on a dark backdrop — what X does
 * when you tap a picture. Arrow keys and the side buttons move between files;
 * Escape or a click outside closes it.
 */
export function MediaLightbox({
  media,
  start,
  onClose,
}: {
  media: Post["media"];
  start: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(start);
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});
  const count = media.length;
  const step = useCallback((dir: number) => setIndex((i) => (i + dir + count) % count), [count]);
  const item = media[index];

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") step(-1);
      if (event.key === "ArrowRight") step(1);
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose, step]);

  if (!item || typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Media ${index + 1} of ${count}`}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute top-4 right-4 grid size-10 place-items-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
      >
        <svg viewBox="0 0 16 16" fill="none" className="size-5" aria-hidden="true">
          <path d="m3.5 3.5 9 9m0-9-9 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>

      {count > 1 && (
        <span className="absolute top-5 left-1/2 -translate-x-1/2 font-sans text-sm font-medium text-white/80 tabular-nums">
          {index + 1} / {count}
        </span>
      )}

      <div className="relative grid place-items-center" onClick={(e) => e.stopPropagation()}>
        {item.kind === "photo" ? (
          <>
            {!loaded[item.src] && (
              <span className="absolute size-10 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden="true" />
            )}
            {/* eslint-disable-next-line @next/next/no-img-element -- a signed link at its natural size */}
            <img
              key={item.src}
              src={item.src}
              alt=""
              onLoad={() => setLoaded((prev) => ({ ...prev, [item.src]: true }))}
              className={cn(
                "block max-h-[88vh] max-w-[92vw] rounded-lg object-contain transition-opacity duration-300",
                loaded[item.src] ? "opacity-100" : "opacity-0",
              )}
            />
          </>
        ) : (
          <video
            key={item.src}
            src={withTrim(item.src, item.trimStart, item.trimEnd)}
            controls
            autoPlay
            playsInline
            className="block max-h-[88vh] max-w-[92vw] rounded-lg bg-black object-contain"
          />
        )}
      </div>

      {count > 1 && (
        <>
          <NavButton side="left" onClick={() => step(-1)} />
          <NavButton side="right" onClick={() => step(1)} />
        </>
      )}
    </div>,
    document.body,
  );
}

function NavButton({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={side === "left" ? "Previous" : "Next"}
      className={cn(
        "absolute top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25",
        side === "left" ? "left-4" : "right-4",
      )}
    >
      <svg viewBox="0 0 16 16" fill="none" className="size-5" aria-hidden="true">
        <path
          d={side === "left" ? "m10 3-5 5 5 5" : "m6 3 5 5-5 5"}
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
