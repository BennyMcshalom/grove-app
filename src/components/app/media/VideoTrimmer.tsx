"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { clock } from "@/lib/media-draft";

/**
 * Choose where a clip starts and ends.
 *
 * Nothing is re-encoded: the handles record a range, and playback across the
 * app starts and stops there. Preview loops the chosen range so it is obvious
 * what the post will show.
 */
export function VideoTrimmer({
  file,
  onCancel,
  onApply,
}: {
  file: { name: string; previewUrl: string; trimStart?: number; trimEnd?: number };
  onCancel: () => void;
  onApply: (range: { start: number; end: number; duration: number }) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [duration, setDuration] = useState(0);
  const [start, setStart] = useState(file.trimStart ?? 0);
  const [end, setEnd] = useState(file.trimEnd ?? 0);

  // Loop the selection while previewing.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !duration) return;
    const onTime = () => {
      if (video.currentTime > end || video.currentTime < start - 0.2) video.currentTime = start;
    };
    video.addEventListener("timeupdate", onTime);
    return () => video.removeEventListener("timeupdate", onTime);
  }, [start, end, duration]);

  const seek = (seconds: number) => {
    const video = videoRef.current;
    if (video) video.currentTime = seconds;
  };

  const selected = end - start;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-ink-900/60 p-4" onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Trim ${file.name}`}
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-full w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-2xl bg-surface p-5"
      >
        <h2 className="font-display text-lg font-semibold text-ink-700">Trim video</h2>

        <video
          ref={videoRef}
          src={file.previewUrl}
          controls
          playsInline
          onLoadedMetadata={(event) => {
            const length = event.currentTarget.duration;
            setDuration(length);
            if (!file.trimEnd) setEnd(length);
          }}
          className="w-full rounded-xl bg-ink-900"
        />

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between font-sans text-sm text-ink-400">
            <span>Start {clock(start)}</span>
            <span className="font-medium text-ink-500">{clock(selected)} selected</span>
            <span>End {clock(end)}</span>
          </div>

          <label className="flex items-center gap-3">
            <span className="w-10 shrink-0 font-sans text-xs text-ink-300">Start</span>
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={start}
              onChange={(event) => {
                const next = Math.min(Number(event.target.value), end - 0.5);
                setStart(Math.max(0, next));
                seek(Math.max(0, next));
              }}
              className="h-1 flex-1 accent-primary-500"
            />
          </label>

          <label className="flex items-center gap-3">
            <span className="w-10 shrink-0 font-sans text-xs text-ink-300">End</span>
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={end}
              onChange={(event) => {
                const next = Math.max(Number(event.target.value), start + 0.5);
                setEnd(Math.min(duration, next));
                seek(Math.min(duration, next) - 0.3);
              }}
              className="h-1 flex-1 accent-primary-500"
            />
          </label>
        </div>

        <p className="font-sans text-xs text-ink-300">
          The clip is uploaded whole and played from the part you chose, so trimming is instant.
        </p>

        <div className="flex justify-end gap-2">
          <Button variant="tertiary" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button size="sm" disabled={!duration} onClick={() => onApply({ start, end, duration })}>
            Apply
          </Button>
        </div>
      </div>
    </div>
  );
}
