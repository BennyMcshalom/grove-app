"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * Records a short voice note with the browser's MediaRecorder.
 *
 * Record → pause / resume as often as needed → Stop. Stopping doesn't send:
 * it shows the recording to play back, then Send (which calls `onRecorded`)
 * or Discard. Figma has the mic buttons but no recording states, so these
 * keep to one pill.
 */
const MAX_SECONDS = 120;

type Phase = "idle" | "recording" | "paused" | "review";

export function VoiceRecorder({
  onRecorded,
  label = "Record a reply",
  className,
  disabled = false,
  compact = false,
}: {
  onRecorded: (audio: Blob, seconds: number) => void;
  label?: string;
  className?: string;
  disabled?: boolean;
  /** Icon-sized, for the chat composer's mic button. */
  compact?: boolean;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string>();
  const [take, setTake] = useState<{ audio: Blob; url: string; seconds: number } | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  // Time recorded before the current stretch, plus when that stretch began.
  const banked = useRef(0);
  const stretchStart = useRef(0);

  useEffect(() => {
    if (phase !== "recording") return;
    const timer = setInterval(() => {
      const total = Math.floor(banked.current + (Date.now() - stretchStart.current) / 1000);
      setSeconds(total);
      if (total >= MAX_SECONDS) stop();
    }, 250);
    return () => clearInterval(timer);
  }, [phase]);

  // Let go of the microphone and the preview if the component goes away.
  useEffect(
    () => () => {
      recorder.current?.stream.getTracks().forEach((t) => t.stop());
    },
    [],
  );
  useEffect(() => () => {
    if (take) URL.revokeObjectURL(take.url);
  }, [take]);

  const start = async () => {
    setError(undefined);
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("This browser can't record audio.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const type = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find((t) =>
        MediaRecorder.isTypeSupported(t),
      );
      const media = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
      const chunks: Blob[] = [];
      media.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      media.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const audio = new Blob(chunks, { type: (media.mimeType || "audio/webm").split(";")[0] });
        const length = Math.max(1, Math.round(banked.current));
        if (audio.size > 0) {
          setTake({ audio, url: URL.createObjectURL(audio), seconds: length });
          setPhase("review");
        } else {
          setPhase("idle");
        }
      };
      recorder.current = media;
      banked.current = 0;
      stretchStart.current = Date.now();
      setSeconds(0);
      media.start();
      setPhase("recording");
    } catch {
      setError("Microphone permission was declined.");
    }
  };

  const pause = () => {
    if (recorder.current?.state !== "recording") return;
    recorder.current.pause();
    banked.current += (Date.now() - stretchStart.current) / 1000;
    setSeconds(Math.floor(banked.current));
    setPhase("paused");
  };

  const resume = () => {
    if (recorder.current?.state !== "paused") return;
    stretchStart.current = Date.now();
    recorder.current.resume();
    setPhase("recording");
  };

  function stop() {
    const media = recorder.current;
    if (!media || media.state === "inactive") return;
    if (media.state === "recording") banked.current += (Date.now() - stretchStart.current) / 1000;
    media.stop();
  }

  const discard = () => {
    setTake(null);
    setSeconds(0);
    setPhase("idle");
  };

  const send = () => {
    if (!take) return;
    onRecorded(take.audio, take.seconds);
    discard();
  };

  const time = formatSeconds(phase === "review" && take ? take.seconds : seconds);

  if (phase === "idle") {
    return compact ? (
      <button
        type="button"
        disabled={disabled}
        onClick={start}
        aria-label={label}
        title={error ?? label}
        className={cn("flex h-8 items-center rounded-full px-1.5 transition-colors hover:bg-ivory-200 disabled:opacity-40", className)}
      >
        <MicIcon />
      </button>
    ) : (
      <span className="flex flex-col gap-1">
        <button
          type="button"
          disabled={disabled}
          onClick={start}
          className={cn(
            "flex w-fit items-center gap-2 rounded-full bg-primary-50 px-4 py-2.5 font-ui text-sm font-medium text-primary-800 transition-colors hover:bg-primary-100 disabled:opacity-60",
            className,
          )}
        >
          <MicIcon />
          {label}
        </button>
        {error && <span className="font-sans text-xs text-destructive-60">{error}</span>}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "flex items-center gap-1.5 rounded-full bg-ivory-200 py-1 pr-1.5 pl-3",
        compact ? "min-w-0" : "w-fit",
        className,
      )}
    >
      {phase === "review" && take ? (
        <>
          {/* The take to listen back to before it goes anywhere. */}
          <audio src={take.url} controls preload="metadata" className="h-8 max-w-[200px] min-w-0" />
          <PillButton label="Discard" onClick={discard}>
            <TrashIcon />
          </PillButton>
          <PillButton label="Send voice note" onClick={send} tone="primary" disabled={disabled}>
            <SendIcon />
          </PillButton>
        </>
      ) : (
        <>
          <span
            className={cn("size-2 shrink-0 rounded-full", phase === "recording" ? "animate-pulse bg-destructive-60" : "bg-ink-300")}
            aria-hidden="true"
          />
          <span className="font-sans text-xs font-medium text-ink-600 tabular-nums" aria-live="polite">
            {phase === "paused" ? `Paused · ${time}` : time}
          </span>
          {phase === "recording" ? (
            <PillButton label="Pause" onClick={pause}>
              <PauseIcon />
            </PillButton>
          ) : (
            <PillButton label="Resume" onClick={resume}>
              <MicIcon />
            </PillButton>
          )}
          <PillButton label="Stop and review" onClick={stop} tone="danger">
            <StopIcon />
          </PillButton>
        </>
      )}
    </span>
  );
}

function PillButton({
  label,
  onClick,
  children,
  tone = "plain",
  disabled,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  tone?: "plain" | "primary" | "danger";
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      disabled={disabled}
      className={cn(
        "grid size-7 shrink-0 place-items-center rounded-full transition-colors disabled:opacity-50",
        tone === "primary" && "bg-primary-500 text-white hover:bg-primary-400",
        tone === "danger" && "bg-destructive-60 text-white hover:opacity-90",
        tone === "plain" && "text-ink-600 hover:bg-ivory-300",
      )}
    >
      {children}
    </button>
  );
}

export function formatSeconds(total: number) {
  const m = Math.floor(total / 60);
  const s = String(total % 60).padStart(2, "0");
  return `${String(m).padStart(2, "0")}:${s}`;
}

function MicIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="size-4" aria-hidden="true">
      <rect x="6" y="2" width="4" height="7" rx="2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M3.5 7.5a4.5 4.5 0 0 0 9 0M8 12v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className="size-3.5" aria-hidden="true">
      <rect x="4" y="4" width="8" height="8" rx="1.5" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className="size-3.5" aria-hidden="true">
      <rect x="4" y="3.5" width="2.5" height="9" rx="1" />
      <rect x="9.5" y="3.5" width="2.5" height="9" rx="1" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="size-4" aria-hidden="true">
      <path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8.5h5.8l.6-8.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="size-3.5" aria-hidden="true">
      <path d="M2.5 8 13 3l-3.5 10-2-4-5-1Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}
