import "server-only";
import { cache } from "react";
import type { Conversation } from "@/lib/conversations";
import type { Post, StoryUpdate } from "@/lib/posts";
import { signPaths } from "@/lib/storage-server";
import { createClient } from "@/lib/supabase/server";
import { timeAgo } from "@/lib/time";

/** How many comments a signed-out visitor reads before the sign-up wall. */
export const PUBLIC_COMMENT_COUNT = 3;

export interface PublicComment {
  id: string;
  author: string;
  avatar: string | null;
  body: string;
  time: string;
  roots: number;
  replies: number;
}

export interface PublicPost {
  id: string;
  chapterSlug: string;
  chapterName: string | null;
  conversation: Conversation | null;
  topic: string | null;
  updates: StoryUpdate[];
  kind: Post["kind"];
  author: string;
  avatar: string | null;
  authorPhase: string | null;
  progress: Post["progress"];
  title: string | null;
  body: string | null;
  time: string;
  createdAt: string;
  media: Post["media"];
  /** The first photo's storage path, streamed by /p/<id>/image for link previews. */
  firstPhotoPath: string | null;
  roots: number;
  comments: number;
  /** The start of the conversation; the rest is behind sign-up. */
  topComments: PublicComment[];
}

/**
 * A post as anyone with its link reads it (the database decides which posts
 * qualify: named, shared with Everyone, link open). One lookup per request,
 * shared by the page and its link preview.
 */
export const loadPublicPost = cache(async (postId: string): Promise<PublicPost | null> => {
  if (!/^[0-9a-f-]{36}$/i.test(postId)) return null;
  const supabase = await createClient();
  const [{ data: rows, error }, { data: commentRows, error: commentsError }] = await Promise.all([
    supabase.rpc("public_post", { p_post_id: postId }),
    supabase.rpc("public_post_comments", { p_post_id: postId, p_limit: PUBLIC_COMMENT_COUNT }),
  ]);
  if (error) console.error("[public-post] public_post failed", error);
  if (commentsError) console.error("[public-post] public_post_comments failed", commentsError);
  const row = rows?.[0];
  if (!row) return null;

  // The rows above are public by the database's rule, so their files are
  // signed with the secret key (anon can't read the media bucket).
  const signed = await signPaths(
    "media",
    row.media.map((m) => m.path),
    { width: 1280, asService: true },
  );
  const now = Date.now();

  return {
    id: row.id,
    chapterSlug: row.chapter_slug,
    chapterName: row.chapter_name,
    conversation: row.conversation,
    topic: row.topic,
    updates: (row.updates ?? []).map((u) => ({
      id: u.id,
      body: u.body,
      time: timeAgo(u.created_at, now),
      createdAt: u.created_at,
    })),
    kind: row.kind,
    author: row.author_name || "Someone",
    avatar: row.author_avatar,
    authorPhase: row.author_phase,
    progress: row.progress,
    title: row.title,
    body: row.body,
    time: timeAgo(row.created_at, now),
    createdAt: row.created_at,
    media: row.media.flatMap((m) => {
      const src = signed.get(m.path);
      return src
        ? [{ src, kind: m.kind, trimStart: m.trim_start, trimEnd: m.trim_end, width: m.width, height: m.height }]
        : [];
    }),
    firstPhotoPath: row.media.find((m) => m.kind === "photo")?.path ?? null,
    roots: row.roots_count,
    comments: row.comments_count,
    topComments: (commentRows ?? []).map((c) => ({
      id: c.id,
      author: c.author_name || "Someone",
      avatar: c.author_avatar,
      body: c.body,
      time: timeAgo(c.created_at, now),
      roots: c.roots_count,
      replies: c.reply_count,
    })),
  };
});
