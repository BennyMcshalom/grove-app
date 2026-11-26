"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { FeedSkeleton, PostCardSkeleton } from "@/components/ui/Skeleton";
import { ConversationCard } from "@/components/app/conversations/ConversationCard";
import { loadConversationPage } from "@/lib/post-actions";
import type { ConversationCursor, ConversationPage, ConversationQuery, Post } from "@/lib/posts";

/** The nearest ancestor that scrolls, or null for the window. */
function scrollParent(node: HTMLElement): HTMLElement | null {
  for (let el = node.parentElement; el; el = el.parentElement) {
    const { overflowY } = getComputedStyle(el);
    if (overflowY === "auto" || overflowY === "scroll") return el;
  }
  return null;
}

// What each feed had loaded and how far down it was, so coming back to Home
// from a post or a profile lands where you left (kept for this tab only).
const memory = new Map<string, { posts: Post[]; cursor: ConversationCursor | null; scrollTop: number; at: number }>();
const MEMORY_MS = 10 * 60 * 1000;

/**
 * Endless scroll for the new Home and Space pages: 15 per fetch, the next
 * page requested well before the end (near-end prefetch), duplicates dropped
 * by ID, and the scroll position kept when you come back.
 */
export function ConversationList({
  query,
  initial,
  empty,
}: {
  query: ConversationQuery;
  /** The first page, rendered on the server. */
  initial?: ConversationPage;
  empty: React.ReactNode;
}) {
  const key = JSON.stringify(query);
  // Read once, on mount.
  const [fresh] = useState(() => {
    const remembered = memory.get(key);
    return remembered && Date.now() - remembered.at < MEMORY_MS ? remembered : undefined;
  });

  const [posts, setPosts] = useState<Post[] | null>(fresh?.posts ?? initial?.posts ?? null);
  const [cursor, setCursor] = useState<ConversationCursor | null>(
    fresh ? fresh.cursor : (initial?.nextCursor ?? null),
  );
  const [error, setError] = useState(fresh ? undefined : initial?.error);
  const [loadingMore, setLoadingMore] = useState(false);
  const busy = useRef(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const top = useRef<HTMLDivElement>(null);
  const restoreTo = useRef(fresh?.scrollTop ?? null);

  // No server page (a tab switched on the client): fetch the first one.
  useEffect(() => {
    if (posts !== null) return;
    let cancelled = false;
    loadConversationPage(JSON.parse(key), null).then((page) => {
      if (cancelled) return;
      setPosts(page.posts);
      setCursor(page.nextCursor);
      setError(page.error);
    });
    return () => {
      cancelled = true;
    };
  }, [key, posts]);

  // Back where you were, once the remembered posts are on the page.
  useLayoutEffect(() => {
    const el = top.current && scrollParent(top.current);
    if (restoreTo.current !== null && el) {
      el.scrollTop = restoreTo.current;
      restoreTo.current = null;
    }
  }, []);

  // Remember what's loaded and how far down, on the way out.
  const latest = useRef({ posts, cursor });
  useEffect(() => {
    // The same object throughout, so the cleanup below reads the newest values.
    latest.current.posts = posts;
    latest.current.cursor = cursor;
  }, [posts, cursor]);
  useEffect(() => {
    const el = top.current ? scrollParent(top.current) : null;
    const state = latest.current;
    return () => {
      if (state.posts) {
        memory.set(key, { posts: state.posts, cursor: state.cursor, scrollTop: el?.scrollTop ?? 0, at: Date.now() });
      }
    };
  }, [key]);

  const loadMore = useCallback(async () => {
    if (!cursor || busy.current) return;
    busy.current = true;
    setLoadingMore(true);
    const page = await loadConversationPage(JSON.parse(key), cursor);
    setPosts((prev) => {
      const seen = new Set(prev?.map((p) => p.id));
      return [...(prev ?? []), ...page.posts.filter((p) => !seen.has(p.id))];
    });
    setCursor(page.nextCursor);
    if (page.error) setError(page.error);
    busy.current = false;
    setLoadingMore(false);
  }, [cursor, key]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !cursor) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      // About two screens early, so the next 15 are usually there before you are.
      { root: scrollParent(el), rootMargin: "1600px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [cursor, loadMore]);

  if (posts === null) return <FeedSkeleton />;

  if (posts.length === 0) {
    return (
      <div ref={top}>
        {error ? <p className="py-10 text-center font-sans text-sm text-destructive-60">{error}</p> : empty}
      </div>
    );
  }

  return (
    <div ref={top} className="flex flex-col gap-3">
      {posts.map((post) => (
        <ConversationCard key={post.id} post={post} />
      ))}
      {cursor && <div ref={sentinel} aria-hidden="true" className="h-px" />}
      {loadingMore && <PostCardSkeleton />}
      {error && <p className="text-center font-sans text-sm text-destructive-60">{error}</p>}
      {!cursor && !error && (
        <p className="py-6 text-center font-sans text-sm text-ink-300">You&rsquo;re all caught up.</p>
      )}
    </div>
  );
}

/** After posting: the next visit to Home starts fresh, with the new post. */
export function forgetConversations() {
  memory.clear();
}
