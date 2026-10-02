import "server-only";
import { ENDING_SCOPES, type FeedPage, type FeedQuery, type Post } from "@/lib/posts";
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
    p_author_id: query.authorId ?? null,
  });

  if (error) {
    console.error("[feed] feed_posts failed", error);
    return { posts: [], nextCursor: null, error: "We couldn't load posts. Try again." };
  }

  const rows = data ?? [];
  const last = rows.at(-1);

  return {
    posts: await toPosts(rows, viewerName),
    // The feed ends at 48 hours: no next page, ever.
    nextCursor:
      !ENDING_SCOPES.includes(query.scope) && rows.length === FEED_PAGE_SIZE && last
        ? { before: last.created_at, beforeId: last.id }
        : null,
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
  const [signed, roots] = await Promise.all([
    signPaths("media", rows.flatMap((row) => row.media.map((m) => m.path)), { width: 1280 }),
    rootCounts(rows.map((row) => row.id)),
  ]);
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
      return src
        ? [{ src, kind: m.kind, trimStart: m.trim_start, trimEnd: m.trim_end, width: m.width, height: m.height }]
        : [];
    }),
    openGrove: row.open_grove,
    audience: row.audience ?? "everyone",
    comments: row.comments_count,
    rooted: row.rooted,
    roots: roots.get(row.id) ?? (row.rooted ? 1 : 0),
    mine: row.is_mine,
    createdAt: row.created_at,
  }));
}

/**
 * How many people rooted each post ("Root 22", as comments show it). Read
 * from posts itself, under the same RLS as the feed, so feed_posts keeps its
 * shape.
 */
async function rootCounts(ids: string[]): Promise<Map<string, number>> {
  if (ids.length === 0) return new Map();
  const supabase = await createClient();
  const { data, error } = await supabase.from("posts").select("id, roots_count").in("id", ids);
  if (error) console.error("[feed] root counts failed", error);
  return new Map((data ?? []).map((p) => [p.id, p.roots_count]));
}
