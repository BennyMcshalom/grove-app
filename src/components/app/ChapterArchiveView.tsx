"use client";

import Link from "next/link";
import { useState } from "react";
import { ChapterReflection, type Reflection } from "@/components/app/ChapterReflection";
import { FeedList } from "@/components/app/FeedList";
import { LogMemories } from "@/components/app/LogPrompt";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import type { LogEntry } from "@/lib/log";
import type { FeedPage, FeedQuery } from "@/lib/posts";

/**
 * Career Archive — Figma frames 382:11745 (Posts) and 433:16789 (Logs).
 *
 * A title bar carrying "Read Reflection", then Posts / Logs tabs over a
 * 1096px column: the posts and log moments from while the chapter was open.
 */
const TABS = ["Posts", "Logs"];

export function ChapterArchiveView({
  name,
  posts,
  postsQuery,
  logs,
  reflection,
}: {
  name: string;
  posts: FeedPage;
  postsQuery: Omit<FeedQuery, "cursor">;
  logs: LogEntry[];
  reflection: Reflection;
}) {
  const [tab, setTab] = useState(TABS[0]);
  const [reflecting, setReflecting] = useState(false);

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
            <FeedList
              query={postsQuery}
              initial={posts}
              empty={
                <p className="py-10 text-center font-sans text-sm text-ink-300">
                  You didn&rsquo;t post in this chapter.
                </p>
              }
            />
          ) : (
            <LogMemories entries={logs} header={false} surface="white" />
          )}
        </div>
      </div>

      {reflecting && (
        <ChapterReflection
          chapter={name}
          reflection={reflection}
          onClose={() => setReflecting(false)}
        />
      )}
    </div>
  );
}

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
