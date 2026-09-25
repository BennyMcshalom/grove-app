"use client";

import Link from "next/link";
import { useState } from "react";
import { Photo } from "@/components/ui/Media";
import { withTrim } from "@/lib/media-draft";
import type { Post } from "@/lib/posts";
import { cn } from "@/lib/cn";

/**
 * One post as a 9:16 tile in a profile grid (Instagram's layout): the first
 * photo or video fills the tile, cropped to fit; a post without media shows
 * its words on a warm card. Tapping opens the post.
 */
export function PostTile({ post }: { post: Post }) {
  const cover = post.media[0];
  const [loaded, setLoaded] = useState(false);
  const words = post.title || post.body;

  return (
    <Link
      href={`/posts/${post.id}`}
      className="group relative block aspect-[9/16] overflow-hidden rounded-lg bg-ivory-200 sm:rounded-xl"
      aria-label={words ? `Open post: ${words.slice(0, 60)}` : "Open post"}
    >
      {cover ? (
        <>
          {!loaded && <span className="absolute inset-0 shimmer bg-ivory-300" aria-hidden="true" />}
          {cover.kind === "photo" ? (
            <Photo
              src={cover.src}
              alt=""
              fill
              unoptimized
              sizes="(min-width: 1024px) 360px, 33vw"
              onLoad={() => setLoaded(true)}
              className={cn(
                "object-cover transition-[opacity,transform] duration-300 group-hover:scale-[1.03]",
                loaded ? "opacity-100" : "opacity-0",
              )}
            />
          ) : (
            <video
              src={withTrim(cover.src, cover.trimStart, cover.trimEnd)}
              muted
              playsInline
              preload="metadata"
              onLoadedData={() => setLoaded(true)}
              className="absolute inset-0 size-full object-cover"
            />
          )}
          <span className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/55 to-transparent" aria-hidden="true" />
          {words && (
            <span className="absolute inset-x-0 bottom-0 line-clamp-2 px-2.5 pb-2.5 font-sans text-xs leading-snug font-medium text-white sm:text-sm">
              {words}
            </span>
          )}
        </>
      ) : (
        <span className="absolute inset-0 flex flex-col justify-center bg-gradient-to-br from-primary-100 via-ivory-100 to-primary-50 p-3 sm:p-4">
          {post.title && (
            <span className="line-clamp-3 font-display text-sm font-semibold text-ink-700 sm:text-lg">{post.title}</span>
          )}
          {post.body && (
            <span className="mt-1 line-clamp-[7] font-sans text-xs text-ink-500 sm:text-sm">{post.body}</span>
          )}
        </span>
      )}

      {/* Corner marks: a video, several files, posted anonymously. */}
      <span className="absolute top-2 right-2 flex gap-1">
        {cover?.kind === "video" && <Mark label="Video"><PlayIcon /></Mark>}
        {post.media.length > 1 && <Mark label={`${post.media.length} files`}><StackIcon /></Mark>}
      </span>
      {post.anonymous && (
        <span className="absolute top-2 left-2 rounded-full bg-black/50 px-2 py-0.5 font-sans text-[10px] font-semibold text-white">
          Anonymous
        </span>
      )}
    </Link>
  );
}

function Mark({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span title={label} className="grid size-6 place-items-center rounded-full bg-black/50 text-white">
      {children}
      <span className="sr-only">{label}</span>
    </span>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className="size-3" aria-hidden="true">
      <path d="M5 3.5v9l7.5-4.5L5 3.5Z" />
    </svg>
  );
}

function StackIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="size-3.5" aria-hidden="true">
      <rect x="5" y="5" width="8.5" height="8.5" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M2.5 11V3.5a1 1 0 0 1 1-1H11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
