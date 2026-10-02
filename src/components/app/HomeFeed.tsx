"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/app/TopBar";
import { Composer } from "@/components/app/Composer";
import { DailyCards } from "@/components/app/DailyCards";
import { EmptyFeed } from "@/components/app/EmptyFeed";
import { FeedEnd, FeedList } from "@/components/app/FeedList";
import { RightRail } from "@/components/app/RightRail";
import { ChapterToday } from "@/components/app/home/ChapterToday";
import { IntroStatusModal } from "@/components/app/home/IntroStatusModal";
import { MatchesModal } from "@/components/app/home/MatchesModal";
import type { Introduction } from "@/lib/matches";
import type { WrapSummary } from "@/lib/wrapped";
import type { DailyCard } from "@/lib/bonds";
import type { FeedPage } from "@/lib/posts";

/**
 * Home feed — Figma frame 58:2301.
 *
 * A 724px scrolling feed column beside the 396px right rail (94:2684). "All"
 * is the last 48 hours from you, your circle and your bonds, newest first,
 * and then it ends; each chapter tab narrows it to one space and falls back
 * to the empty state Figma draws (650:37394 / 664:16902).
 */
export function HomeFeed({
  firstPage,
  cards,
  introductions = [],
  matchCount = 0,
  wrap = null,
  openMatches = false,
  openIntroId = null,
}: {
  firstPage: FeedPage;
  cards: DailyCard[];
  /** Chapter Today: introductions sent and received. */
  introductions?: Introduction[];
  /** How many potential connections are waiting (0 hides the card). */
  matchCount?: number;
  wrap?: Pick<WrapSummary, "id" | "range"> | null;
  /** Opened from a link: the matches modal, or one introduction. */
  openMatches?: boolean;
  openIntroId?: string | null;
}) {
  const router = useRouter();
  const [matchesOpen, setMatchesOpen] = useState(openMatches);
  const [intro, setIntro] = useState<Introduction | null>(
    () => introductions.find((i) => i.connectionId === openIntroId) ?? null,
  );
  // A notification link can land here while Home is already open: follow it.
  const [linked, setLinked] = useState({ openMatches, openIntroId });
  if (linked.openMatches !== openMatches || linked.openIntroId !== openIntroId) {
    setLinked({ openMatches, openIntroId });
    if (openMatches) setMatchesOpen(true);
    const target = introductions.find((i) => i.connectionId === openIntroId);
    if (target) setIntro(target);
  }
  // Links that opened a modal leave the address clean once it closes.
  const clearQuery = () => {
    if (openMatches || openIntroId) router.replace("/home", { scroll: false });
  };
  // Figma's phone Home (601:30182) has no inline composer: it sits behind the
  // orange FAB above the tab bar.
  const [composing, setComposing] = useState(false);
  const [chapterSlug, setChapterSlug] = useState<string | null>(null);

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar onTabChange={setChapterSlug} />

        {/* Figma 90:1355 — the feed column is the scroll region. */}
        <div className="min-h-0 flex-1 scroll-slim overflow-y-auto px-4 py-6 lg:px-8">
          <div className="mx-auto flex w-full max-w-[724px] flex-col gap-6 pb-10">
            {/* What's happening now (a reply, new matches) leads, above the composer. */}
            <ChapterToday
              introductions={introductions}
              matchCount={matchCount}
              wrap={wrap}
              onOpenIntro={setIntro}
              onOpenMatches={() => setMatchesOpen(true)}
            />
            <div className="hidden lg:block">
              <Composer />
            </div>
            <DailyCards cards={cards} />
            <FeedList
              key={chapterSlug ?? "all"}
              query={{ scope: "home", chapterSlug }}
              initial={chapterSlug === null ? firstPage : undefined}
              empty={<EmptyFeed onCompose={() => setComposing(true)} />}
              ending={<FeedEnd />}
            />
          </div>
        </div>
      </div>

      <RightRail />

      {/* The composer FAB, above the phone tab bar. */}
      <button
        type="button"
        onClick={() => setComposing(true)}
        aria-label="Root a thought"
        className="fixed right-5 bottom-24 z-30 grid size-14 place-items-center rounded-full bg-primary-500 text-white shadow-[0px_4px_16px_0px_rgba(0,0,0,0.2)] transition-colors hover:bg-primary-400 lg:hidden"
      >
        <svg viewBox="0 0 24 24" fill="none" className="size-7" aria-hidden="true">
          <path
            d="M12 5v14M5 12h14"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {matchesOpen && (
        <MatchesModal
          onClose={() => {
            setMatchesOpen(false);
            clearQuery();
          }}
        />
      )}
      {intro && (
        <IntroStatusModal
          intro={intro}
          onClose={() => {
            setIntro(null);
            clearQuery();
          }}
          onFindMatches={() => {
            setIntro(null);
            setMatchesOpen(true);
          }}
        />
      )}

      {composing && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center scroll-slim overflow-y-auto bg-ink-900/40 p-4"
          onClick={() => setComposing(false)}
        >
          <div
            className="my-auto w-full max-w-[440px] lg:max-w-[660px]"
            onClick={(e) => e.stopPropagation()}
          >
            <Composer onClose={() => setComposing(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
