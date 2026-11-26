"use client";

import { useState } from "react";
import { useToast } from "@/components/app/ToastProvider";
import type { MediaDraft } from "@/lib/media-draft";
import { MEDIA_LIMITS } from "@/lib/posts";
import { createClient } from "@/lib/supabase/client";
import { mediaExtension, mediaSize, uploadWithProgress } from "@/lib/upload";

/**
 * Photos and videos for the New conversation composer, uploaded the moment
 * they're picked (as the Just Grouv composer does), so Publish is quick and a
 * failed upload shows before anything is posted. Crop, trim, reorder and
 * remove work on the tiles (MediaTiles).
 */
export function useAttachments(viewerId: string) {
  const toast = useToast();
  const [attachments, setAttachments] = useState<MediaDraft[]>([]);

  const patch = (id: string, change: Partial<MediaDraft>) =>
    setAttachments((prev) => prev.map((a) => (a.id === id ? { ...a, ...change } : a)));

  const upload = async (id: string, file: Blob, kind: "photo" | "video", name?: string) => {
    // Only extensions createPost accepts (lib/media-path.ts).
    const extension = mediaExtension(file, name) ?? (kind === "photo" ? "jpg" : "mp4");
    const path = `${viewerId}/${crypto.randomUUID()}.${extension}`;
    const result = await uploadWithProgress("media", path, file, (progress) => patch(id, { progress }));
    const failed = "error" in result && result.error;
    patch(id, failed ? { status: "failed" } : { status: "done", path });
    return failed ? null : path;
  };

  const measure = async (id: string, file: Blob, kind: "photo" | "video") => {
    const size = await mediaSize(file, kind);
    if (size) patch(id, size);
  };

  /** From the file picker or a drop: photos and videos, sorted into their kinds. */
  const add = (files: File[]) => {
    const room = MEDIA_LIMITS.maxFiles - attachments.length;
    if (room <= 0) {
      toast({ title: `You can attach up to ${MEDIA_LIMITS.maxFiles} files`, tone: "danger" });
      return;
    }
    const usable = files.filter((file) => {
      const kind = file.type.startsWith("image/") ? "photo" : file.type.startsWith("video/") ? "video" : null;
      if (!kind) {
        toast({ title: "Only photos and videos can go in a post", tone: "danger" });
        return false;
      }
      const limit = kind === "photo" ? MEDIA_LIMITS.photoBytes : MEDIA_LIMITS.videoBytes;
      if (file.size > limit) {
        toast({ title: `${file.name} is over ${kind === "photo" ? "10MB" : "100MB"}`, tone: "danger" });
        return false;
      }
      return true;
    });
    for (const file of usable.slice(0, room)) {
      const kind = file.type.startsWith("image/") ? "photo" : "video";
      const id = crypto.randomUUID();
      setAttachments((prev) => [
        ...prev,
        { id, name: file.name, kind, status: "uploading", progress: 0, file, previewUrl: URL.createObjectURL(file) },
      ]);
      void measure(id, file, kind);
      void upload(id, file, kind);
    }
  };

  const retry = (draft: MediaDraft) => {
    if (!draft.file) return;
    patch(draft.id, { status: "uploading", progress: 0 });
    void upload(draft.id, draft.file, draft.kind, draft.name);
  };

  const remove = (draft: MediaDraft) => {
    URL.revokeObjectURL(draft.previewUrl);
    setAttachments((prev) => prev.filter((a) => a.id !== draft.id));
    if (draft.path) void createClient().storage.from("media").remove([draft.path]);
  };

  const move = (draft: MediaDraft, direction: -1 | 1) =>
    setAttachments((prev) => {
      const index = prev.findIndex((a) => a.id === draft.id);
      const next = index + direction;
      if (index < 0 || next < 0 || next >= prev.length) return prev;
      const copy = [...prev];
      [copy[index], copy[next]] = [copy[next], copy[index]];
      return copy;
    });

  /** A cropped picture replaces the one already uploaded. */
  const crop = (draft: MediaDraft, blob: Blob) => {
    const previous = draft.path;
    URL.revokeObjectURL(draft.previewUrl);
    patch(draft.id, { status: "uploading", progress: 0, file: blob, path: undefined, previewUrl: URL.createObjectURL(blob) });
    void measure(draft.id, blob, "photo");
    void upload(draft.id, blob, "photo", draft.name).then(() => {
      if (previous) void createClient().storage.from("media").remove([previous]);
    });
  };

  /** Trimming only records the range; the file is already uploaded. */
  const trim = (draft: MediaDraft, range: { start: number; end: number; duration: number }) =>
    patch(draft.id, { trimStart: range.start, trimEnd: range.end, duration: range.duration });

  /** Closing without publishing: the uploads go too. */
  const discard = () => {
    const paths = attachments.flatMap((a) => (a.path ? [a.path] : []));
    attachments.forEach((a) => URL.revokeObjectURL(a.previewUrl));
    if (paths.length) void createClient().storage.from("media").remove(paths);
    setAttachments([]);
  };

  return {
    attachments,
    busy: attachments.some((a) => a.status === "uploading" || a.status === "failed"),
    forPost: attachments.flatMap((a) =>
      a.path
        ? [{ path: a.path, kind: a.kind, trimStart: a.trimStart, trimEnd: a.trimEnd, width: a.width, height: a.height }]
        : [],
    ),
    add,
    retry,
    remove,
    move,
    crop,
    trim,
    discard,
  };
}
