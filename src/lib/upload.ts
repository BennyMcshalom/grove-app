import { createClient } from "@/lib/supabase/client";

/** Upload limits the UI enforces before sending (the buckets cap harder). */
export const UPLOAD_LIMITS = {
  photoBytes: 10 * 1024 * 1024,
  videoBytes: 100 * 1024 * 1024,
  audioBytes: 20 * 1024 * 1024,
  documentBytes: 25 * 1024 * 1024,
} as const;

/** Documents chat accepts (the chat bucket allows exactly these). */
export const DOCUMENT_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "text/plain": "txt",
  "text/csv": "csv",
};

export function isDocument(file: Blob) {
  return file.type.split(";")[0] in DOCUMENT_TYPES;
}

/** "2.4 MB" */
export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/heic": "heic",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
  "audio/webm": "webm",
  "audio/mp4": "m4a",
  "audio/mpeg": "mp3",
  "audio/ogg": "ogg",
};

function extensionFor(file: Blob, fallback: string) {
  const type = file.type.split(";")[0];
  if (EXTENSIONS[type]) return EXTENSIONS[type];
  if (DOCUMENT_TYPES[type]) return DOCUMENT_TYPES[type];
  const name = "name" in file ? String((file as File).name) : "";
  const fromName = name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5);
  return fromName || fallback;
}

/**
 * Uploads straight from the browser. `folder` must match the bucket policy:
 * `<user id>` for media, `<conversation id>/<user id>` for chat.
 */
export async function uploadFile(
  bucket: "media" | "chat",
  folder: string,
  file: Blob,
  { prefix = "", fallbackExtension = "bin" }: { prefix?: string; fallbackExtension?: string } = {},
): Promise<{ path: string } | { error: string }> {
  const path = `${folder}/${prefix}${crypto.randomUUID()}.${extensionFor(file, fallbackExtension)}`;
  const { error } = await createClient()
    .storage.from(bucket)
    .upload(path, file, { contentType: file.type || undefined });

  if (error) {
    console.error(`[upload] ${bucket} upload failed`, error);
    return { error: "That file didn't upload. Try again." };
  }
  return { path };
}

export function removeUploads(bucket: "media" | "chat", paths: string[]) {
  if (paths.length) void createClient().storage.from(bucket).remove(paths);
}

/** Reads a video or audio file's length in whole seconds, if the browser can. */
export function mediaDuration(file: Blob, kind: "video" | "audio"): Promise<number | null> {
  return new Promise((resolve) => {
    const element = document.createElement(kind);
    const url = URL.createObjectURL(file);
    element.preload = "metadata";
    element.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(element.duration) ? Math.round(element.duration) : null);
    };
    element.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    element.src = url;
  });
}
