import type { Conversation } from "@/lib/conversations";

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

/**
 * Who a post is for — the composer's audience menu (Figma 1310:23137).
 * "everyone" is the author's circle and bonds, as posts always were.
 */
export const AUDIENCES = [
  { value: "only_me", label: "Only me", hint: "Visible only to you" },
  { value: "selected_bonds", label: "Selected Bonds", hint: "Choose specific Bonds to share with" },
  { value: "everyone", label: "Everyone", hint: "Your circle, your Space, and anyone you send the link" },
] as const;

export type PostAudience = (typeof AUDIENCES)[number]["value"];

export function audienceLabel(audience: PostAudience) {
  return AUDIENCES.find((a) => a.value === audience)?.label ?? "Everyone";
}

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
  /** Written by a Grouv guide (a labelled house account). */
  guide?: boolean;
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
    /** Pixel size, when the composer recorded it; reserves the space. */
    width?: number | null;
    height?: number | null;
  }[];
  comments: number;
  /** The viewer's own Root. */
  rooted: boolean;
  /** How many people rooted it, shown as "Root 22" like comments. */
  roots: number;
  /** Shared to Open Grouv: reaches people at the same stage beyond the circle. */
  openGrove: boolean;
  /** Who it's for; the author's own cards label anything narrower than everyone. */
  audience: PostAudience;
  mine: boolean;
  createdAt: string;
  /** What kind of conversation it starts; null for posts without a type. */
  conversation: Conversation | null;
  /** A topic inside its Space (src/lib/conversations.ts). */
  topic: string | null;
  /** In the viewer's Kept list. */
  kept: boolean;
  /** The viewer follows this Unfinished story. */
  following: boolean;
  /** An Unfinished story's updates from its author, oldest first. */
  updates: StoryUpdate[];
  /** New Home: why it's in the feed ("Why am I seeing this?"). */
  reason?: FeedReason;
}

/** Why a post is in For You, Following or a Space page (conversation_feed). */
export type FeedReason = "connection" | "space" | "new_voice" | "discussion" | "public" | "following_story";

/** The new Home's two views, and a Space page. */
export type ConversationView = "for_you" | "following" | "space";

export interface ConversationQuery {
  view: ConversationView;
  /** Space page only. */
  chapterSlug?: string | null;
  /** Space page only: one subhub. */
  topic?: string | null;
}

/**
 * Where the next page starts. asOf is the first page's moment, held fixed so
 * the ranking doesn't shift between pages; For You and Spaces continue after
 * (score, id), Following after (activity, id).
 */
export interface ConversationCursor {
  asOf: string;
  score: number | null;
  at: string | null;
  id: string;
}

export interface ConversationPage {
  posts: Post[];
  nextCursor: ConversationCursor | null;
  error?: string;
}

/** 15 per fetch (Phase 1 handoff). */
export const CONVERSATION_PAGE_SIZE = 15;

export interface StoryUpdate {
  id: string;
  body: string;
  time: string;
  createdAt: string;
}

export interface PostComment {
  id: string;
  authorId: string;
  author: string;
  avatar: string | null;
  /** Written by a Grouv guide (a labelled house account). */
  guide?: boolean;
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
 *   home  — public posts (7 days) plus your circle and bonds (48 hours), ranked
 *   roots — the same, in one space
 *   open  — Open Grouv posts from people outside the circle at your stage
 *   mine  — the viewer's own posts, anonymous ones included (pages)
 *   all   — whatever the viewer may see (permalinks)
 *
 * home and roots are ranked (private.feed_score): engagement over age, lifted
 * for your circle, bonds and Spaces. One page of up to 100, then they end.
 */
export type FeedScope = "home" | "all" | "roots" | "open" | "mine" | "person" | "kept";

/** Ranked scopes: one page, never load more. */
export const ENDING_SCOPES: FeedScope[] = ["home", "roots"];

export interface FeedQuery {
  scope: FeedScope;
  chapterSlug?: string | null;
  /** Only posts created in this window (a closed chapter's archive). */
  from?: string | null;
  to?: string | null;
  /** Scope "open" only: people whose region is within this many km. */
  withinKm?: number | null;
  /** Scope "person" only: whose Grouv page this is. */
  authorId?: string | null;
  cursor?: FeedCursor | null;
}

export interface FeedPage {
  posts: Post[];
  /** Null when this was the last page. */
  nextCursor: FeedCursor | null;
  error?: string;
}
