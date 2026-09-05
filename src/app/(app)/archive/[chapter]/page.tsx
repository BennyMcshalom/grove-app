"use client";

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

export default function ChapterArchivePage() {
  const params = useParams<{ chapter: string }>();
  const [tab, setTab] = useState(TABS[0]);
  const [reflecting, setReflecting] = useState(false);

  const name = getChapter(params.chapter)?.name ?? "Chapter";

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Frame 382:11746 — title left, "Read Reflection" right. */}
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-4 bg-white px-6 py-6 lg:px-8">
        <h1 className="font-display text-2xl font-semibold text-ink-600">
          {name} Archive
        </h1>
        <Button size="sm" onClick={() => setReflecting(true)}>
          Read Reflection
        </Button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 lg:px-8">
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
