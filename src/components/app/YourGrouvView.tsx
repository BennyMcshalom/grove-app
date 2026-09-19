"use client";

import { Photo } from "@/components/ui/Media";
import { useState } from "react";
import { EmptyFeed } from "@/components/app/EmptyFeed";
import { FeedList } from "@/components/app/FeedList";
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
 * A 1096px column: the rings hero (489:17418), then a two-tab group whose
 * first tab lists your posts and whose second shows the logged days as a row
 * of captioned photo tiles (435:19253).
 */
const TABS = ["Your Posts", "Your Grouv Logs"];

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

            {tab === TABS[0] ? (
              <FeedList query={{ scope: "mine" }} initial={posts} empty={<EmptyFeed />} />
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-3xl bg-surface px-4 py-10 text-center">
                <p className="font-sans text-sm text-ink-300">You haven&rsquo;t logged a moment yet.</p>
                <Button size="sm" href="/log">
                  Open Grouv Log
                </Button>
              </div>
            ) : (
              <div className="rounded-3xl bg-surface px-4 py-3">
                <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                  {logs.map((log) => (
                    <li
                      key={log.id}
                      className="relative aspect-[254/219] overflow-hidden rounded-[20px] border border-ink-100 bg-ivory-100"
                    >
                      {log.photoUrl && (
                        <Photo src={log.photoUrl} alt="" fill unoptimized className="object-cover" />
                      )}
                      <span
                        className={cn(
                          "absolute inset-x-0 bottom-0 flex flex-col items-center gap-1 px-3 py-3",
                          log.photoUrl
                            ? "bg-gradient-to-t from-ink-900/70 to-transparent"
                            : "top-0 justify-center",
                        )}
                      >
                        <span
                          className={cn(
                            "flex items-center gap-2 font-sans text-[10px] font-medium",
                            log.photoUrl ? "text-white" : "text-ink-300",
                          )}
                        >
                          Day {log.dayNumber}
                          <span className={cn("size-1 rounded-full", log.photoUrl ? "bg-ink-50" : "bg-ink-300")} />
                          {logDateLabel(log.entryDate)}
                        </span>
                        {log.body && (
                          <span
                            className={cn(
                              "line-clamp-3 text-center font-sans text-sm font-medium",
                              log.photoUrl ? "text-white" : "text-ink-600",
                            )}
                          >
                            {log.body}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
