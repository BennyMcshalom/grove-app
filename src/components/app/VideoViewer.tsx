"use client";

import { useEffect } from "react";

/**
 * A larger look at a video, inside the app, in the video's own shape: a
 * portrait clip stays portrait on a dark backdrop instead of the browser
 * stretching it to full screen. Escape or a click outside closes it.
 */
export function VideoViewer({ src, label, onClose }: { src: string; label: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
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
      <video
        src={src}
        controls
        autoPlay
        playsInline
        controlsList="nofullscreen"
        disablePictureInPicture
        onClick={(e) => e.stopPropagation()}
        className="block h-auto max-h-[88vh] w-auto max-w-[92vw] rounded-2xl bg-black object-contain"
      />
    </div>
  );
}
