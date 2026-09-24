import { createClient } from "@/lib/supabase/client";
import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase/env";

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

/**
 * Like uploadFile, but reports progress (0–1) as the bytes go up — the
 * Supabase client can't, so this talks to the Storage endpoint directly with
 * the viewer's own token, which RLS checks exactly the same way.
 */
export async function uploadWithProgress(
  bucket: "media" | "chat",
  path: string,
  file: Blob,
  onProgress: (fraction: number) => void,
  signal?: AbortSignal,
): Promise<{ path: string } | { error: string }> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { error: "You're signed out. Sign in and try again." };

  return new Promise((resolve) => {
    const request = new XMLHttpRequest();
    request.open("POST", `${supabaseUrl()}/storage/v1/object/${bucket}/${encodeURI(path)}`);
    request.setRequestHeader("Authorization", `Bearer ${token}`);
    request.setRequestHeader("apikey", supabasePublishableKey());
    request.setRequestHeader("x-upsert", "false");
    request.setRequestHeader("cache-control", "max-age=3600");
    if (file.type) request.setRequestHeader("Content-Type", file.type);

    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        onProgress(1);
        resolve({ path });
      } else {
        console.error(`[upload] ${bucket} upload failed`, request.status, request.responseText);
        resolve({ error: "That file didn't upload. Try again." });
      }
    };
    request.onerror = () => resolve({ error: "The upload was interrupted. Check your connection and retry." });
    request.onabort = () => resolve({ error: "Upload cancelled." });
    signal?.addEventListener("abort", () => request.abort());
    request.send(file);
  });
}

/** A photo's or video's pixel size, read locally before it uploads. */
export function mediaSize(file: Blob, kind: "photo" | "video"): Promise<{ width: number; height: number } | null> {
  const url = URL.createObjectURL(file);
  const done = (size: { width: number; height: number } | null) => {
    URL.revokeObjectURL(url);
    return size && size.width > 0 && size.height > 0 ? size : null;
  };
  return new Promise((resolve) => {
    if (kind === "photo") {
      const image = new Image();
      image.onload = () => resolve(done({ width: image.naturalWidth, height: image.naturalHeight }));
      image.onerror = () => resolve(done(null));
      image.src = url;
    } else {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => resolve(done({ width: video.videoWidth, height: video.videoHeight }));
      video.onerror = () => resolve(done(null));
      video.src = url;
    }
  });
}
