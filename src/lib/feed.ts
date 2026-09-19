import "server-only";
import type { FeedPage, FeedQuery, Post } from "@/lib/posts";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { signPaths } from "@/lib/storage-server";
import { timeAgo } from "@/lib/time";

type FeedRow = Database["public"]["Functions"]["feed_posts"]["Returns"][number];

export const FEED_PAGE_SIZE = 20;

/**
 * One page of posts as the cards render them, plus where the next page
 * starts (null when this was the last). RLS decides visibility.
 */
export async function loadFeed(query: FeedQuery, viewerName: string): Promise<FeedPage> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("feed_posts", {
    p_scope: query.scope,
    p_chapter_slug: query.chapterSlug ?? null,
    p_from: query.from ?? null,
    p_to: query.to ?? null,
    p_before: query.cursor?.before ?? null,
    p_before_id: query.cursor?.beforeId ?? null,
    p_limit: FEED_PAGE_SIZE,
    p_within_km: query.withinKm ?? null,
  });

  if (error) {
    console.error("[feed] feed_posts failed", error);
    return { posts: [], nextCursor: null, error: "We couldn't load posts. Try again." };
  }

  const rows = data ?? [];
  const last = rows.at(-1);

  return {
    posts: await toPosts(rows, viewerName),
    nextCursor:
      rows.length === FEED_PAGE_SIZE && last ? { before: last.created_at, beforeId: last.id } : null,
  };
}

/** A single post the viewer may see, for permalinks. */
export async function loadPost(postId: string, viewerName: string): Promise<Post | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("feed_posts", { p_scope: "all", p_post_id: postId, p_limit: 1 });
  if (error) console.error("[feed] loadPost failed", error);
  const [post] = await toPosts(data ?? [], viewerName);
  return post ?? null;
}

async function toPosts(rows: FeedRow[], viewerName: string): Promise<Post[]> {
  const signed = await signPaths("media", rows.flatMap((row) => row.media.map((m) => m.path)));
  const now = Date.now();
  return rows.map((row) => ({
    id: row.id,
    chapterSlug: row.chapter_slug,
    kind: row.kind,
    author: row.is_anonymous
      ? row.is_mine
        ? `${viewerName} · anonymous`
        : "Anonymous"
      : (row.author_name ?? "Someone"),
    authorId: row.author_id,
    avatar: row.is_anonymous ? null : row.author_avatar,
    anonymous: row.is_anonymous,
    authorPhase: row.author_phase,
    progress: row.progress,
    time: timeAgo(row.created_at, now),
    title: row.title,
    body: row.body,
    media: row.media.flatMap((m) => {
      const src = signed.get(m.path);
      return src ? [{ src, kind: m.kind, trimStart: m.trim_start, trimEnd: m.trim_end }] : [];
    }),
    roots: row.roots_count,
    comments: row.comments_count,
    rooted: row.rooted,
    mine: row.is_mine,
    createdAt: row.created_at,
  }));
}
