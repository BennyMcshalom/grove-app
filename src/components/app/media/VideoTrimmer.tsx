"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MediaEditorShell } from "@/components/app/media/MediaEditorShell";
import { clock } from "@/lib/media-draft";

/** How many frames the strip shows. Enough to find a moment, cheap to make. */
const FRAMES = 10;

/**
 * Choose where a clip starts and ends.
 *
 * The strip under the video is real frames pulled out of the file, the way
 * WhatsApp's trimmer works: you drag the ends of the selection rather than
 * guessing at timestamps, everything outside it dims, and a playhead tracks
 * playback. Nothing is re-encoded — the range is stored and every player in
 * the app starts and stops there.
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
  const stripRef = useRef<HTMLDivElement>(null);
  const [duration, setDuration] = useState(0);
  const [start, setStart] = useState(file.trimStart ?? 0);
  const [end, setEnd] = useState(file.trimEnd ?? 0);
  const [playhead, setPlayhead] = useState(file.trimStart ?? 0);
  const [playing, setPlaying] = useState(false);
  const [frames, setFrames] = useState<string[]>([]);
  const dragging = useRef<"start" | "end" | null>(null);

  /** Pull evenly spaced frames out of the file for the strip. */
  const buildStrip = useCallback(async (length: number) => {
    const video = document.createElement("video");
    video.src = file.previewUrl;
    video.muted = true;
    video.playsInline = true;
    await new Promise((resolve) => {
      video.onloadeddata = resolve;
      video.onerror = resolve;
    });
    if (!video.videoWidth) return;

    const canvas = document.createElement("canvas");
    canvas.height = 96;
    canvas.width = Math.max(1, Math.round((video.videoWidth / video.videoHeight) * 96));
    const context = canvas.getContext("2d");
    if (!context) return;

    const shots: string[] = [];
    for (let i = 0; i < FRAMES; i += 1) {
      const at = (length * (i + 0.5)) / FRAMES;
      await new Promise<void>((resolve) => {
        video.onseeked = () => resolve();
        video.currentTime = Math.min(at, Math.max(0, length - 0.05));
      });
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      shots.push(canvas.toDataURL("image/jpeg", 0.6));
      setFrames([...shots]);
    }
  }, [file.previewUrl]);

  // Keep playback inside the selection, and follow it with the playhead.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !duration) return;
    const onTime = () => {
      if (video.currentTime > end || video.currentTime < start - 0.25) {
        video.currentTime = start;
      }
      setPlayhead(video.currentTime);
    };
    video.addEventListener("timeupdate", onTime);
    return () => video.removeEventListener("timeupdate", onTime);
  }, [start, end, duration]);

  const seek = (seconds: number) => {
    const video = videoRef.current;
    if (video) video.currentTime = seconds;
    setPlayhead(seconds);
  };

  /** Where a pointer sits along the strip, in seconds. */
  const secondsAt = (clientX: number) => {
    const strip = stripRef.current;
    if (!strip || !duration) return 0;
    const box = strip.getBoundingClientRect();
    return Math.min(duration, Math.max(0, ((clientX - box.left) / box.width) * duration));
  };

  const onStripPointerDown = (event: React.PointerEvent) => {
    if (!duration) return;
    const at = secondsAt(event.clientX);
    // Grab whichever handle is closer, unless the tap is well inside — then scrub.
    const nearStart = Math.abs(at - start);
    const nearEnd = Math.abs(at - end);
    const grabWithin = duration * 0.08;
    if (Math.min(nearStart, nearEnd) < grabWithin) {
      dragging.current = nearStart <= nearEnd ? "start" : "end";
    } else {
      dragging.current = null;
      seek(at);
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onStripPointerMove = (event: React.PointerEvent) => {
    if (!dragging.current) return;
    const at = secondsAt(event.clientX);
    if (dragging.current === "start") {
      const next = Math.min(at, end - 0.5);
      setStart(Math.max(0, next));
      seek(Math.max(0, next));
    } else {
      const next = Math.max(at, start + 0.5);
      setEnd(Math.min(duration, next));
      seek(Math.max(start, Math.min(duration, next) - 0.3));
    }
  };

  const onStripPointerUp = () => {
    dragging.current = null;
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      if (video.currentTime < start || video.currentTime > end) video.currentTime = start;
      void video.play();
    } else {
      video.pause();
    }
  };

  const percent = (seconds: number) => (duration ? (seconds / duration) * 100 : 0);
  const selected = end - start;
  const whole = start === 0 && Math.abs(end - duration) < 0.05;

  return (
    <MediaEditorShell
      title="Trim video"
      onCancel={onCancel}
      onDone={() => onApply({ start, end, duration })}
      doneDisabled={!duration}
      toolbar={
        <div className="mx-auto flex w-full max-w-xl flex-col gap-3">
          <div className="flex items-center justify-between font-sans text-xs text-white/60">
            <span>{clock(start)}</span>
            <span className="rounded-full bg-white/10 px-3 py-1 font-medium text-white">
              {whole ? `Whole clip · ${clock(duration)}` : `${clock(selected)} selected`}
            </span>
            <span>{clock(end)}</span>
          </div>

          {/* The strip: frames from the file, with the selection over them. */}
          <div
            ref={stripRef}
            onPointerDown={onStripPointerDown}
            onPointerMove={onStripPointerMove}
            onPointerUp={onStripPointerUp}
            onPointerCancel={onStripPointerUp}
            className="relative h-16 touch-none overflow-hidden rounded-xl bg-white/5 select-none"
          >
            <div aria-hidden="true" className="absolute inset-0 flex">
              {frames.length > 0
                ? frames.map((frame, i) => (
                    /* eslint-disable-next-line @next/next/no-img-element -- frames drawn from the local file */
                    <img key={i} src={frame} alt="" className="h-full min-w-0 flex-1 object-cover" />
                  ))
                : Array.from({ length: FRAMES }, (_, i) => <span key={i} className="h-full flex-1 bg-white/5" />)}
            </div>

            {/* Everything outside the selection is dimmed. */}
            <div className="pointer-events-none absolute inset-y-0 left-0 bg-black/65" style={{ width: `${percent(start)}%` }} />
            <div className="pointer-events-none absolute inset-y-0 right-0 bg-black/65" style={{ width: `${100 - percent(end)}%` }} />

            <div
              className="pointer-events-none absolute inset-y-0 border-y-2 border-primary-500"
              style={{ left: `${percent(start)}%`, width: `${Math.max(0, percent(end) - percent(start))}%` }}
            />

            <Handle side="left" at={percent(start)} label="Trim start" />
            <Handle side="right" at={percent(end)} label="Trim end" />

            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow-[0_0_6px_rgba(0,0,0,0.6)]"
              style={{ left: `${percent(playhead)}%` }}
            />
          </div>

          <p className="text-center font-sans text-xs text-white/40">
            Drag the ends to trim · tap the strip to scrub. The clip uploads whole and plays from the part you chose.
          </p>
        </div>
      }
    >
      <div className="relative flex max-h-full items-center justify-center">
        <video
          ref={videoRef}
          src={file.previewUrl}
          playsInline
          onLoadedMetadata={(event) => {
            const length = event.currentTarget.duration;
            if (!Number.isFinite(length)) return;
            setDuration(length);
            if (!file.trimEnd) setEnd(length);
            void buildStrip(length);
          }}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onClick={togglePlay}
          className="max-h-[60vh] max-w-full rounded-xl bg-black"
        />

        <button
          type="button"
          onClick={togglePlay}
          aria-label={playing ? "Pause" : "Play"}
          className="absolute grid size-14 place-items-center rounded-full bg-black/45 text-white backdrop-blur transition-opacity hover:bg-black/60"
          style={{ opacity: playing ? 0 : 1 }}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="size-7" aria-hidden="true">
            <path d="M8 5.5v13l11-6.5z" />
          </svg>
        </button>
      </div>
    </MediaEditorShell>
  );
}

/** One end of the selection. Wide enough to grab with a thumb. */
function Handle({ side, at, label }: { side: "left" | "right"; at: number; label: string }) {
  return (
    <span
      role="slider"
      aria-label={label}
      aria-valuenow={Math.round(at)}
      aria-valuemin={0}
      aria-valuemax={100}
      tabIndex={-1}
      style={{ left: `${at}%` }}
      className={`absolute inset-y-0 flex w-5 cursor-ew-resize items-center justify-center bg-primary-500 shadow-[0_0_0_1px_rgba(0,0,0,0.25)] ${
        side === "left" ? "rounded-l-lg" : "-translate-x-full rounded-r-lg"
      }`}
    >
      <span aria-hidden="true" className="h-6 w-0.5 rounded-full bg-white/90" />
    </span>
  );
}
