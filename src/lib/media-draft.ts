"use client";

export type MediaKind = "photo" | "video";

/** One attachment while it is still being prepared in the composer. */
export interface MediaDraft {
  id: string;
  kind: MediaKind;
  name: string;
  /** An object URL for the local file — revoke it when the draft goes. */
  previewUrl: string;
  status: "uploading" | "done" | "failed";
  /** 0–1 while uploading. */
  progress?: number;
  /** The file itself, kept so a failed upload can be retried. */
  file?: Blob;
  /** Pixel size, measured before upload so the post reserves its shape. */
  width?: number;
  height?: number;
  /** Where it landed in the `media` bucket, once uploaded. */
  path?: string;
  /** Seconds. Set by the trimmer; playback honours the range. */
  trimStart?: number;
  trimEnd?: number;
  /** Natural duration of a video, for the trimmer's scale. */
  duration?: number;
}

/**
 * Adds the trimmed range to a video URL.
 *
 * Trimming is stored rather than re-encoded: cutting the file in the browser
 * means either a ~25MB ffmpeg download or a lossy re-encode, and neither is
 * worth it to skip a few seconds. Browsers understand a media fragment, so
 * the clip starts and ends where it was trimmed without touching the file.
 */
export function withTrim(src: string, trimStart?: number | null, trimEnd?: number | null) {
  const start = trimStart ?? 0;
  if (!start && trimEnd == null) return src;
  const range = trimEnd != null ? `${round(start)},${round(trimEnd)}` : `${round(start)}`;
  return `${src}#t=${range}`;
}

const round = (seconds: number) => Math.max(0, Math.round(seconds * 100) / 100);

/** "1:04" — for the trimmer's readout. */
export function clock(seconds: number) {
  if (!Number.isFinite(seconds)) return "0:00";
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}
