"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PostCard } from "@/components/app/PostCard";
import { loadPosts } from "@/lib/post-actions";
import type { FeedCursor, FeedPage, FeedQuery, Post } from "@/lib/posts";

/** The nearest ancestor that scrolls, or null for the window. */
function scrollParent(node: HTMLElement): HTMLElement | null {
  for (let el = node.parentElement; el; el = el.parentElement) {
    const { overflowY } = getComputedStyle(el);
    if (overflowY === "auto" || overflowY === "scroll") return el;
  }
  return null;
}

/**
 * A feed of posts that loads more as the end scrolls into view.
 *
 * Pass `initial` when the server already rendered the first page; without it
 * the first page loads on mount. Give the component a `key` per query so
 * switching tabs starts a fresh list.
 */
export function FeedList({
  query,
  initial,
  empty,
  renderPost = (post) => <PostCard key={post.id} post={post} />,
}: {
  query: Omit<FeedQuery, "cursor">;
  initial?: FeedPage;
  empty: React.ReactNode;
  renderPost?: (post: Post) => React.ReactNode;
}) {
  const queryKey = JSON.stringify(query);
  const [posts, setPosts] = useState<Post[] | null>(initial?.posts ?? null);
  const [cursor, setCursor] = useState<FeedCursor | null>(initial?.nextCursor ?? null);
  const [error, setError] = useState(initial?.error);
  const loadingMore = useRef(false);
  const [showLoadingMore, setShowLoadingMore] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const hasInitial = initial !== undefined;

  useEffect(() => {
    if (hasInitial) return;
    let cancelled = false;
    loadPosts(JSON.parse(queryKey)).then((page) => {
      if (cancelled) return;
      setPosts(page.posts);
      setCursor(page.nextCursor);
      setError(page.error);
    });
    return () => {
      cancelled = true;
    };
  }, [queryKey, hasInitial]);

  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore.current) return;
    loadingMore.current = true;
    setShowLoadingMore(true);

    const page = await loadPosts({ ...JSON.parse(queryKey), cursor });
    setPosts((prev) => {
      const seen = new Set(prev?.map((p) => p.id));
      return [...(prev ?? []), ...page.posts.filter((p) => !seen.has(p.id))];
    });
    setCursor(page.nextCursor);
    if (page.error) setError(page.error);

    loadingMore.current = false;
    setShowLoadingMore(false);
  }, [cursor, queryKey]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !cursor) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      // The feed scrolls inside its own column, not the window, so measure
      // against that column — otherwise "600px away" is measured from the
      // wrong box and pages load that nobody has scrolled near.
      { root: scrollParent(el), rootMargin: "600px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [cursor, loadMore]);

  if (posts === null) {
    return <p className="py-10 text-center font-sans text-sm text-ink-300">Loading posts…</p>;
  }

  if (posts.length === 0) {
    return error ? (
      <p className="py-10 text-center font-sans text-sm text-destructive-60">{error}</p>
    ) : (
      <>{empty}</>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {posts.map((post) => renderPost(post))}
      {cursor && <div ref={sentinel} aria-hidden="true" className="h-px" />}
      {showLoadingMore && (
        <p className="text-center font-sans text-sm text-ink-300">Loading more…</p>
      )}
      {error && <p className="text-center font-sans text-sm text-destructive-60">{error}</p>}
    </div>
  );
}
