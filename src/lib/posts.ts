/**
 * Post option lists — the database stores the `value`, the UI shows the
 * `label`. Values match the enums in supabase/migrations.
 */

/** Composer and Edit Post "Where are you in it?" chips (Figma 106:3641). */
export const PROGRESS = [
  { value: "just_started", label: "Just started" },
  { value: "in_progress", label: "In progress" },
  { value: "in_the_thick_of_it", label: "In the thick of it" },
  { value: "almost_done", label: "Almost done" },
  { value: "wrapping_up", label: "Wrapping up" },
  { value: "starting_over", label: "Starting over" },
] as const;

export type PostProgress = (typeof PROGRESS)[number]["value"];

export function progressLabel(progress: PostProgress | null) {
  return PROGRESS.find((p) => p.value === progress)?.label;
}

/** Report Post reasons (Figma 115:7248, "Harrassment" spelled correctly). */
export const REPORT_REASONS = [
  { value: "spam", label: "Spam" },
  { value: "harassment", label: "Harassment" },
  { value: "inappropriate", label: "Inappropriate" },
  { value: "other", label: "Other" },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]["value"];

/** Limits the composer enforces before uploading (the bucket caps at 100MB). */
export const MEDIA_LIMITS = {
  maxFiles: 4,
  photoBytes: 10 * 1024 * 1024,
  videoBytes: 100 * 1024 * 1024,
} as const;

/** A post as the cards render it — built on the server from feed_posts rows. */
export interface Post {
  id: string;
  chapterSlug: string;
  kind: "root" | "grouv";
  /** Display name; "Anonymous" when the author chose not to be named. */
  author: string;
  authorId: string | null;
  avatar: string | null;
  anonymous: boolean;
  /** The author's current phase in this chapter, when they're named. */
  authorPhase: string | null;
  progress: PostProgress | null;
  time: string;
  title: string | null;
  body: string | null;
  /** Signed URLs, in the order they were attached. */
  media: { src: string; kind: "photo" | "video" }[];
  roots: number;
  comments: number;
  rooted: boolean;
  mine: boolean;
  createdAt: string;
}

export interface PostComment {
  id: string;
  authorId: string;
  author: string;
  avatar: string | null;
  body: string;
  time: string;
  mine: boolean;
}

/** Where the next page starts: the last post of the current one. */
export interface FeedCursor {
  before: string;
  beforeId: string;
}

/**
 * Which posts a feed shows:
 *   all   — everything the viewer may see (home)
 *   roots — a space's posts from the viewer, their circle, or anonymous
 *   open  — named people outside the circle at the viewer's stage
 *   mine  — the viewer's own posts, anonymous ones included
 */
export type FeedScope = "all" | "roots" | "open" | "mine";

export interface FeedQuery {
  scope: FeedScope;
  chapterSlug?: string | null;
  /** Only posts created in this window (a closed chapter's archive). */
  from?: string | null;
  to?: string | null;
  cursor?: FeedCursor | null;
}

export interface FeedPage {
  posts: Post[];
  /** Null when this was the last page. */
  nextCursor: FeedCursor | null;
  error?: string;
}
