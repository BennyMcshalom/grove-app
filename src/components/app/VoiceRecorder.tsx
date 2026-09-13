"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * Records a short voice note with the browser's MediaRecorder. Tap to start,
 * tap again to stop; `onRecorded` gets the audio and its length. Figma has the
 * mic buttons but no recording state, so this keeps to one pill.
 */
const MAX_SECONDS = 120;

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
  /** Icon-only, for the chat composer's mic button. */
  compact?: boolean;
}) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string>();
  const recorder = useRef<MediaRecorder | null>(null);
  const startedAt = useRef(0);

  useEffect(() => {
    if (!recording) return;
    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt.current) / 1000);
      setSeconds(elapsed);
      if (elapsed >= MAX_SECONDS) recorder.current?.stop();
    }, 250);
    return () => clearInterval(timer);
  }, [recording]);

  // Stop the microphone if the component goes away mid-recording.
  useEffect(() => () => recorder.current?.stream.getTracks().forEach((t) => t.stop()), []);

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
        setRecording(false);
        const length = Math.max(1, Math.round((Date.now() - startedAt.current) / 1000));
        const audio = new Blob(chunks, { type: (media.mimeType || "audio/webm").split(";")[0] });
        if (audio.size > 0) onRecorded(audio, length);
      };
      recorder.current = media;
      startedAt.current = Date.now();
      setSeconds(0);
      media.start();
      setRecording(true);
    } catch {
      setError("Microphone permission was declined.");
    }
  };

  const stop = () => recorder.current?.state === "recording" && recorder.current.stop();

  if (compact) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={recording ? stop : start}
        aria-pressed={recording}
        aria-label={recording ? "Stop recording" : label}
        title={error ?? (recording ? `Recording ${formatSeconds(seconds)}` : label)}
        className={cn(
          "flex h-8 items-center gap-1 rounded-full px-1.5 transition-colors disabled:opacity-40",
          recording ? "bg-destructive-60 text-white" : "hover:bg-ivory-200",
          className,
        )}
      >
        {recording ? <StopIcon /> : <MicIcon />}
        {recording && <span className="font-sans text-xs">{formatSeconds(seconds)}</span>}
      </button>
    );
  }

  return (
    <span className="flex flex-col gap-1">
      <button
        type="button"
        disabled={disabled}
        onClick={recording ? stop : start}
        aria-pressed={recording}
        className={cn(
          "flex w-fit items-center gap-2 rounded-full px-4 py-2.5 font-ui text-sm font-medium transition-colors disabled:opacity-60",
          recording
            ? "bg-destructive-60 text-white hover:opacity-90"
            : "bg-primary-50 text-primary-800 hover:bg-primary-100",
          className,
        )}
      >
        {recording ? <StopIcon /> : <MicIcon />}
        {recording ? `Stop · ${formatSeconds(seconds)}` : label}
      </button>
      {error && <span className="font-sans text-xs text-destructive-60">{error}</span>}
    </span>
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
    <svg viewBox="0 0 16 16" fill="currentColor" className="size-4" aria-hidden="true">
      <rect x="4" y="4" width="8" height="8" rx="1.5" />
    </svg>
  );
}
