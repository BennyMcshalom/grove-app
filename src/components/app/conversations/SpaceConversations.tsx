"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { RightRail } from "@/components/app/RightRail";
import { TopBar } from "@/components/app/TopBar";
import { ConversationList } from "@/components/app/conversations/ConversationList";
import { FloatingCompose, useScrolledPast } from "@/components/app/conversations/FloatingCompose";
import { JoinSpaceButton } from "@/components/app/conversations/JoinSpaceButton";
import { NewComposer } from "@/components/app/conversations/NewComposer";
import { getChapter } from "@/lib/chapters";
import { cn } from "@/lib/cn";
import { topicsFor } from "@/lib/conversations";
import type { ConversationPage } from "@/lib/posts";

/**
 * A new Space page (Phase 1 handoff): this Space's conversations, narrowed
 * by subhub ("Space: Relationships · Subhub: Family"). Members, questions
 * and managing the chapter stay one tap away in the classic view.
 */
export function SpaceConversations({
  slug,
  joined,
  firstPage,
}: {
  slug: string;
  joined: boolean;
  firstPage: ConversationPage;
}) {
  const chapter = getChapter(slug)!;
  const subhubs = topicsFor(slug);
  const [subhub, setSubhub] = useState<string | null>(null);
  const header = useRef<HTMLElement>(null);
  const pastHeader = useScrolledPast(header);
  const [composing, setComposing] = useState(false);
  const subhubLabel = subhubs.find((t) => t.slug === subhub)?.label;

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar title={chapter.name} back="/spaces" />

        <div className="min-h-0 flex-1 scroll-slim overflow-y-auto px-4 py-5 lg:px-8">
          <div className="mx-auto flex w-full max-w-[640px] flex-col gap-4 pb-10">
            <header ref={header} className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 flex-col gap-0.5">
                <h1 className="font-sans text-2xl font-semibold text-ink-800">{chapter.name}</h1>
                <p className="font-sans text-sm text-ink-400">
                  Space: {chapter.name}
                  {subhubLabel && <> · Subhub: {subhubLabel}</>}
                </p>
              </div>
              {joined ? (
                <button
                  type="button"
                  onClick={() => setComposing(true)}
                  className="shrink-0 rounded-full bg-ink-800 px-4 py-2 font-sans text-sm font-semibold text-white hover:bg-ink-700"
                >
                  Post
                </button>
              ) : (
                <JoinSpaceButton chapter={chapter} className="py-2" />
              )}
            </header>

            {subhubs.length > 0 && (
              <div role="tablist" aria-label="Subhubs" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
                {[{ slug: null as string | null, label: "All conversations" }, ...subhubs].map((t) => (
                  <button
                    key={t.slug ?? "all"}
                    type="button"
                    role="tab"
                    aria-selected={subhub === t.slug}
                    onClick={() => setSubhub(t.slug)}
                    className={cn(
                      "shrink-0 rounded-full px-3.5 py-1.5 font-sans text-sm font-semibold transition-colors",
                      subhub === t.slug ? "bg-ink-800 text-white" : "bg-ivory-300 text-ink-500 hover:bg-ivory-400",
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}

            <ConversationList
              key={subhub ?? "all"}
              query={{ view: "space", chapterSlug: slug, topic: subhub }}
              initial={subhub === null ? firstPage : undefined}
              empty={
                <p className="rounded-2xl border border-dashed border-ink-100 px-6 py-10 text-center font-sans text-[15px] text-ink-400">
                  {subhubLabel ? `No ${subhubLabel} conversations yet.` : `No conversations in ${chapter.name} yet.`}
                  {joined && " Start one."}
                </p>
              }
            />

            {joined && (
              <Link
                href={`/spaces/${slug}?view=classic`}
                className="self-center font-sans text-sm font-medium text-ink-400 hover:text-ink-700"
              >
                Members, questions and chapter settings
              </Link>
            )}

            {joined && <FloatingCompose visible={pastHeader} onClick={() => setComposing(true)} />}
          </div>
        </div>
      </div>

      <RightRail />

      {composing && (
        <NewComposer initialSpace={slug} onClose={() => setComposing(false)} />
      )}
    </div>
  );
}
