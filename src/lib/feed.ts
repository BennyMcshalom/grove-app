import "server-only";
import {
  CONVERSATION_PAGE_SIZE,
  ENDING_SCOPES,
  type ConversationCursor,
  type ConversationPage,
  type ConversationQuery,
  type FeedPage,
  type FeedQuery,
  type FeedReason,
  type Post,
} from "@/lib/posts";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { guideIds } from "@/lib/grouv-guides";
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
    // Ranked feeds come as one page: no next page, ever.
    nextCursor:
      !ENDING_SCOPES.includes(query.scope) && rows.length === FEED_PAGE_SIZE && last
        ? { before: last.created_at, beforeId: last.id }
        : null,
  };
}

/**
 * The new Home (For You, Following) and Space pages: 15 posts per fetch,
 * continuing from the cursor. Safety and access are decided in the database
 * before ranking (conversation_feed, migration 20261119100000).
 */
export async function loadConversations(
  query: ConversationQuery,
  cursor: ConversationCursor | null,
  viewerName: string,
): Promise<ConversationPage> {
  const supabase = await createClient();
  const asOf = cursor?.asOf ?? new Date().toISOString();
  const { data, error } = await supabase.rpc("conversation_feed", {
    p_view: query.view,
    p_chapter_slug: query.chapterSlug ?? null,
    p_topic: query.topic ?? null,
    p_as_of: asOf,
    p_cursor_score: cursor?.score ?? null,
    p_cursor_at: cursor?.at ?? null,
    p_cursor_id: cursor?.id ?? null,
    p_limit: CONVERSATION_PAGE_SIZE,
  });

  if (error) {
    // The database doesn't have conversation_feed yet (migration not applied):
    // fall back to the existing feed, one page, rather than an empty Home.
    if (error.code === "PGRST202") {
      if (cursor || query.view === "following") return { posts: [], nextCursor: null };
      const legacy = await loadFeed(
        { scope: query.view === "space" ? "roots" : "home", chapterSlug: query.chapterSlug ?? null },
        viewerName,
      );
      const posts = query.topic ? legacy.posts.filter((p) => p.topic === query.topic) : legacy.posts;
      return { posts, nextCursor: null, error: legacy.error };
    }
    console.error("[feed] conversation_feed failed", error.code, error.message);
    return { posts: [], nextCursor: null, error: "We couldn't load conversations. Try again." };
  }

  const rows = data ?? [];
  const last = rows.at(-1);
  const posts = await toPosts(rows, viewerName);
  const reasons = new Map(rows.map((row) => [row.id, row.reason as FeedReason]));
  return {
    posts: posts.map((post) => ({ ...post, reason: reasons.get(post.id) })),
    nextCursor:
      rows.length === CONVERSATION_PAGE_SIZE && last
        ? {
            asOf,
            score: query.view === "following" ? null : last.score,
            at: query.view === "following" ? last.activity_at : null,
            id: last.id,
          }
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
  const [signed, roots, guides] = await Promise.all([
    signPaths("media", rows.flatMap((row) => row.media.map((m) => m.path)), { width: 1280 }),
    rootCounts(rows.map((row) => row.id)),
    guideIds(rows.map((row) => (row.is_anonymous ? null : row.author_id))),
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
    guide: !row.is_anonymous && !!row.author_id && guides.has(row.author_id),
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
    conversation: row.conversation,
    topic: row.topic,
    kept: row.kept,
    following: row.following,
    updates: (row.updates ?? []).map((u) => ({
      id: u.id,
      body: u.body,
      time: timeAgo(u.created_at, now),
      createdAt: u.created_at,
    })),
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
