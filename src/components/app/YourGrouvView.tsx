"use client";

import { Photo } from "@/components/ui/Media";
import { useState } from "react";
import { EmptyFeed } from "@/components/app/EmptyFeed";
import { FeedList } from "@/components/app/FeedList";
import { MomentViewer } from "@/components/app/LogCoverflow";
import { PostTile } from "@/components/app/PostTile";
import { GrouvRings, type RingPerson, type RingPrompts } from "@/components/app/GrouvRings";
import { TopBar } from "@/components/app/TopBar";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { logDateLabel, type LogEntry } from "@/lib/log";
import type { FeedPage } from "@/lib/posts";

/**
 * Your Grouv — Figma frames 417:16407 (Your Posts) and 435:18506 (Your Grouv
 * Logs).
 *
 * A 1096px column: the rings hero (489:17418), then a two-tab group. Both
 * tabs are a 3-column grid of 9:16 tiles, newest first — posts, and logged
 * moments.
 */
const TABS = ["Your Posts", "Your Grouv Logs"];

/** A logged moment as a 9:16 tile: its photo, or its words on a warm card. */
function LogTile({ entry, onOpen }: { entry: LogEntry; onOpen: () => void }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative block aspect-[9/16] w-full overflow-hidden rounded-lg bg-ivory-200 text-left sm:rounded-xl"
    >
      {entry.photoUrl ? (
        <>
          {!loaded && <span className="absolute inset-0 shimmer bg-ivory-300" aria-hidden="true" />}
          <Photo
            src={entry.photoUrl}
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
        </>
      ) : (
        <span className="absolute inset-0 bg-gradient-to-br from-primary-100 via-ivory-100 to-primary-50 p-3 sm:p-4">
          <span className="line-clamp-[9] font-display text-sm leading-snug text-ink-700 sm:text-base">{entry.body}</span>
        </span>
      )}
      <span
        className={cn(
          "absolute inset-x-0 bottom-0 flex flex-col gap-0.5 px-2.5 pb-2.5",
          entry.photoUrl && "bg-gradient-to-t from-black/65 to-transparent pt-10",
        )}
      >
        {entry.photoUrl && entry.body && (
          <span className="line-clamp-2 font-sans text-xs leading-snug font-medium text-white sm:text-sm">{entry.body}</span>
        )}
        <span className={cn("font-sans text-[10px] font-medium sm:text-xs", entry.photoUrl ? "text-white/85" : "text-ink-400")}>
          Day {entry.dayNumber} · {logDateLabel(entry.entryDate)}
        </span>
      </span>
    </button>
  );
}

export function YourGrouvView({
  posts,
  logs,
  people,
  prompts,
}: {
  posts: FeedPage;
  logs: LogEntry[];
  people: RingPerson[];
  prompts: RingPrompts;
}) {
  const [tab, setTab] = useState(TABS[0]);
  const [opened, setOpened] = useState<LogEntry | null>(null);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <TopBar title="Your Grouv" />

      <div className="min-h-0 flex-1 scroll-slim overflow-y-auto px-4 py-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-[1096px] flex-col gap-10 pb-10">
          <GrouvRings people={people} prompts={prompts} />

          <div className="flex flex-col gap-6">
            {/* Tab Group 71:5396 — bottom border, primary-600 when active. */}
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

            {/* Both tabs are a profile grid: three across, 9:16 tiles, newest
                first (Instagram's layout). */}
            {tab === TABS[0] ? (
              <FeedList
                query={{ scope: "mine" }}
                initial={posts}
                layout="grid"
                empty={<EmptyFeed />}
                renderPost={(post) => <PostTile key={post.id} post={post} />}
              />
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-3xl bg-surface px-4 py-10 text-center">
                <p className="font-sans text-sm text-ink-300">You haven&rsquo;t logged a moment yet.</p>
                <Button size="sm" href="/log">
                  Open Grouv Log
                </Button>
              </div>
            ) : (
              <ul className="mx-auto grid w-full max-w-[720px] grid-cols-3 gap-1 sm:gap-2">
                {logs.map((log) => (
                  <li key={log.id}>
                    <LogTile entry={log} onOpen={() => setOpened(log)} />
                  </li>
                ))}
              </ul>
            )}
            {opened && <MomentViewer entry={opened} onClose={() => setOpened(null)} />}
          </div>
        </div>
      </div>
    </div>
  );
}
