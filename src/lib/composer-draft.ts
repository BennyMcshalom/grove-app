"use client";

import type { MediaKind } from "@/lib/media-draft";
import type { PostAudience, PostProgress } from "@/lib/posts";

/**
 * The composer's saved draft (PRD §6: "Draft save is explicit and
 * recoverable"). Kept in this browser only, per person; uploaded media is
 * referenced by its Storage path, so nothing re-uploads on restore. Storage
 * can be unavailable (private windows); every call fails quietly.
 */
export interface ComposerDraft {
  mode: "root" | "grouv";
  chapter: string;
  stage: PostProgress | null;
  anonymous: boolean;
  doing: string;
  honest: string;
  caption: string;
  /** "only_me" only in drafts saved before it left the composer. */
  audience: PostAudience;
  audienceIds: string[];
  /** Shared to Open Grouv (missing in older drafts). */
  openGrouv?: boolean;
  media: {
    path: string;
    kind: MediaKind;
    name: string;
    width?: number;
    height?: number;
    trimStart?: number;
    trimEnd?: number;
    duration?: number;
  }[];
  savedAt: string;
}

const key = (viewerId: string) => `grouv:composer-draft:${viewerId}`;

export function readDraft(viewerId: string): ComposerDraft | null {
  try {
    const raw = window.localStorage.getItem(key(viewerId));
    return raw ? (JSON.parse(raw) as ComposerDraft) : null;
  } catch {
    return null;
  }
}

export function writeDraft(viewerId: string, draft: ComposerDraft) {
  try {
    window.localStorage.setItem(key(viewerId), JSON.stringify(draft));
  } catch {
    // Full or blocked storage: the draft just isn't kept.
  }
}

export function clearDraft(viewerId: string) {
  try {
    window.localStorage.removeItem(key(viewerId));
  } catch {
    // Nothing to clear.
  }
}

/** Whether a draft holds anything worth keeping. */
export function draftHasContent(d: Pick<ComposerDraft, "doing" | "honest" | "caption" | "media">) {
  return Boolean(d.doing.trim() || d.honest.trim() || d.caption.trim() || d.media.length);
}
