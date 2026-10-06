"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { PostCard } from "@/components/app/PostCard";
import { PostCardSkeleton } from "@/components/ui/Skeleton";
import { loadOnePost } from "@/lib/post-actions";
import type { Post } from "@/lib/posts";

/**
 * A post opened from a Grouv grid: the full card (header, words, media,
 * Root / Comment / Share, the comment thread) over a dark backdrop, with the
 * × outside the card's top-right. The profile stays underneath.
 *
 * The open post lives in the URL as `?post=<id>` (pushState, which Next's
 * router keeps in sync with useSearchParams): Back closes it, a refresh or a
 * shared link reopens it over the same page, and /posts/<id> stays the
 * permalink.
 */
export function usePostModal() {
  const params = useSearchParams();
  const openId = params.get("post");
  // The tile that was tapped, so the modal shows it without a round trip.
  const [tapped, setTapped] = useState<Post | null>(null);
  const pushed = useRef(false);

  const open = useCallback(
    (post: Post) => {
      setTapped(post);
      const next = new URLSearchParams(params.toString());
      next.set("post", post.id);
      window.history.pushState(null, "", `?${next.toString()}`);
      pushed.current = true;
    },
    [params],
  );

  const close = useCallback(() => {
    if (pushed.current) {
      pushed.current = false;
      window.history.back();
      return;
    }
    // Arrived on a ?post= link: drop the param without leaving the page.
    const next = new URLSearchParams(params.toString());
    next.delete("post");
    const query = next.toString();
    window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
  }, [params]);

  // Back past our own entry means it's no longer ours to pop.
  useEffect(() => {
    if (!openId) pushed.current = false;
  }, [openId]);

  return {
    openId: openId && /^[0-9a-f-]{36}$/i.test(openId) ? openId : null,
    known: tapped && tapped.id === openId ? tapped : undefined,
    open,
    close,
  };
}

export function PostModal({ postId, initial, onClose }: { postId: string; initial?: Post; onClose: () => void }) {
  const [fetched, setFetched] = useState<{ id: string; post: Post | null } | null>(null);
  const post = initial ?? (fetched?.id === postId ? fetched.post : undefined);

  useEffect(() => {
    if (initial) return;
    let cancelled = false;
    loadOnePost(postId).then((found) => {
      if (!cancelled) setFetched({ id: postId, post: found });
    });
    return () => {
      cancelled = true;
    };
  }, [postId, initial]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented) onClose();
    };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center scroll-slim overflow-y-auto bg-ink-900/70 px-3 pt-16 pb-6 sm:px-8 lg:py-12"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Post"
        onClick={(e) => e.stopPropagation()}
        className="relative my-auto w-full max-w-[724px]"
      >
        {/* The × sits outside the card: above it on smaller screens, beside it from lg. */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute -top-12 right-0 grid size-10 place-items-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25 lg:top-0 lg:-right-14"
        >
          <svg viewBox="0 0 24 24" fill="none" className="size-6" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>

        {post ? (
          <div className="rounded-2xl bg-surface">
            <PostCard post={post} defaultCommentsOpen onDeleted={onClose} />
          </div>
        ) : post === null ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl bg-surface px-6 py-12 text-center">
            <p className="font-sans text-base text-ink-500">This post isn&rsquo;t available.</p>
            <p className="font-sans text-sm text-ink-300">
              It may have been deleted, or it&rsquo;s in a space you don&rsquo;t hold.
            </p>
          </div>
        ) : (
          <PostCardSkeleton />
        )}
      </div>
    </div>
  );
}
