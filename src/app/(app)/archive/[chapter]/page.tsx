"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { ChapterReflection } from "@/components/app/ChapterReflection";
import { LogMemories } from "@/components/app/LogPrompt";
import { PostCard, type Post } from "@/components/app/PostCard";
import { Button } from "@/components/ui/Button";
import { getChapter } from "@/lib/chapters";
import { cn } from "@/lib/cn";

/**
 * Career Archive — Figma frames 382:11745 (Posts) and 433:16789 (Logs).
 *
 * A title bar carrying "Read Reflection", then Posts / Logs tabs over a
 * 1096px column. Figma draws the Career one; the chapter comes from the slug
 * so the other closed chapters reuse it.
 */
const TABS = ["Posts", "Logs"];

/** The four Post instances Figma leaves on their default content. */
const POSTS: Post[] = Array.from({ length: 4 }, (_, i) => ({
  id: String(i),
  author: "Helena Brown",
  avatar: "/images/feed/avatar-helena.png",
  badge: "In progress",
  time: "5 mins ago",
  title: "I think I’m ready for a career change.",
  body: "I’ve been in the same role for almost three years, and lately I’ve been feeling like I’ve outgrown it. I’m excited about what could come next, but honestly, I’m also scared of starting over.",
  roots: 22,
  comments: 8,
}));

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-6" aria-hidden="true">
      <path
        d="M19 12H5m0 0 6-6m-6 6 6 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="size-4" aria-hidden="true">
      <path
        d="M1.5 10S4.5 4.5 10 4.5 18.5 10 18.5 10 15.5 15.5 10 15.5 1.5 10 1.5 10Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

export default function ChapterArchivePage() {
  const params = useParams<{ chapter: string }>();
  const [tab, setTab] = useState(TABS[0]);
  const [reflecting, setReflecting] = useState(false);

  const name = getChapter(params.chapter)?.name ?? "Chapter";

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Frame 382:11746 — title left, "Read Reflection" right. The phone
          frame (638:28331) adds a back arrow and drops the button's fill. */}
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-4 bg-white px-5 py-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/archive"
            aria-label="Back to archive"
            className="shrink-0 text-ink-800 lg:hidden"
          >
            <BackIcon />
          </Link>
          <h1 className="truncate font-display text-xl font-semibold text-ink-600 lg:text-2xl">
            {name} Archive
          </h1>
        </div>

        <button
          type="button"
          onClick={() => setReflecting(true)}
          className="flex shrink-0 items-center gap-2 font-ui text-sm font-medium text-primary-500 lg:hidden"
        >
          <EyeIcon />
          Read Reflection
        </button>
        <span className="hidden lg:block">
          <Button size="sm" onClick={() => setReflecting(true)}>
            Read Reflection
          </Button>
        </span>
      </header>

      <div className="min-h-0 flex-1 scroll-slim overflow-y-auto px-4 py-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-[1096px] flex-col gap-6 pb-10">
          <div role="tablist" className="flex">
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={t === tab}
                onClick={() => setTab(t)}
                className={cn(
                  "h-10 flex-1 border-b-2 px-4 py-2 font-sans text-sm font-medium text-ink-500 transition-colors",
                  t === tab
                    ? "border-primary-600"
                    : "border-ivory-600 hover:border-ivory-700",
                )}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === TABS[0] ? (
            <div className="flex flex-col gap-6">
              {POSTS.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <LogMemories header={false} surface="white" />
          )}
        </div>
      </div>

      {reflecting && (
        <ChapterReflection
          chapter={name}
          onClose={() => setReflecting(false)}
        />
      )}
    </div>
  );
}
