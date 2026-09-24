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
  media: {
    src: string;
    kind: "photo" | "video";
    /** Seconds; set when a clip was trimmed in the composer. */
    trimStart?: number | null;
    trimEnd?: number | null;
  }[];
  comments: number;
  /** The viewer's own "I see you". Never shown as a count. */
  rooted: boolean;
  /** This month's one post shared beyond the author's circle. */
  openGrove: boolean;
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
  /** The comment this one replies to; replies are one level deep. */
  parentId: string | null;
  roots: number;
  rooted: boolean;
}

/** Where the next page starts: the last post of the current one. */
export interface FeedCursor {
  before: string;
  beforeId: string;
}

/**
 * Which posts a feed shows:
 *   home  — you, your circle and your bonds, last 48 hours, newest first
 *   roots — the same, in one space
 *   open  — Open Grove posts from people outside the circle at your stage
 *   mine  — the viewer's own posts, anonymous ones included (pages)
 *   all   — whatever the viewer may see (permalinks)
 *
 * home and roots end: 48 hours, no next page, no ranking of any kind.
 */
export type FeedScope = "home" | "all" | "roots" | "open" | "mine";

/** Scopes that stop at 48 hours and never load more. */
export const ENDING_SCOPES: FeedScope[] = ["home", "roots"];

export interface FeedQuery {
  scope: FeedScope;
  chapterSlug?: string | null;
  /** Only posts created in this window (a closed chapter's archive). */
  from?: string | null;
  to?: string | null;
  /** Scope "open" only: people whose region is within this many km. */
  withinKm?: number | null;
  cursor?: FeedCursor | null;
}

export interface FeedPage {
  posts: Post[];
  /** Null when this was the last page. */
  nextCursor: FeedCursor | null;
  error?: string;
}
