"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/app/Avatar";
import { RightRail } from "@/components/app/RightRail";
import { TopBar } from "@/components/app/TopBar";
import { useViewer } from "@/components/app/ViewerProvider";
import { ConversationList } from "@/components/app/conversations/ConversationList";
import { FloatingCompose, useScrolledPast } from "@/components/app/conversations/FloatingCompose";
import { NewComposer } from "@/components/app/conversations/NewComposer";
import { IntroStatusModal } from "@/components/app/home/IntroStatusModal";
import { MatchesModal } from "@/components/app/home/MatchesModal";
import { cn } from "@/lib/cn";
import type { Introduction } from "@/lib/matches";
import type { ConversationPage } from "@/lib/posts";

type View = "for_you" | "following";

/**
 * The new Home (Phase 1 handoff): one calm feed with two views. For You is
 * the default (ranked, endless); Following is only the people you're
 * connected with and the stories you follow.
 */
export function NewHome({
  firstPage,
  introductions = [],
  openMatches = false,
  openIntroId = null,
}: {
  firstPage: ConversationPage;
  /** Where notification links land: the matches modal, or one introduction. */
  introductions?: Introduction[];
  openMatches?: boolean;
  openIntroId?: string | null;
}) {
  const viewer = useViewer();
  const router = useRouter();
  const [view, setView] = useState<View>("for_you");
  const postBar = useRef<HTMLDivElement>(null);
  const pastPostBar = useScrolledPast(postBar);
  const [composing, setComposing] = useState(false);
  const [matchesOpen, setMatchesOpen] = useState(openMatches);
  const [intro, setIntro] = useState<Introduction | null>(
    () => introductions.find((i) => i.connectionId === openIntroId) ?? null,
  );
  const clearQuery = () => {
    if (openMatches || openIntroId) router.replace("/home", { scroll: false });
  };

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar title="Home" />

        <div className="min-h-0 flex-1 scroll-slim overflow-y-auto px-4 py-5 lg:px-8">
          <div className="mx-auto flex w-full max-w-[640px] flex-col gap-4 pb-10">
            <div role="tablist" aria-label="Feed" className="flex gap-2">
              {(
                [
                  ["for_you", "For You"],
                  ["following", "Following"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={view === value}
                  onClick={() => setView(value)}
                  className={cn(
                    "rounded-full px-4 py-1.5 font-sans text-sm font-semibold transition-colors",
                    view === value ? "bg-ink-800 text-white" : "bg-ivory-300 text-ink-500 hover:bg-ivory-400",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <div ref={postBar} className="flex items-center gap-3 rounded-2xl border border-ink-50 bg-surface p-2.5 pl-3">
              <Avatar
                src={viewer.avatarUrl}
                name={viewer.firstName}
                userId={viewer.id}
                sizes="32px"
                className="size-8 shrink-0"
              />
              <button
                type="button"
                onClick={() => setComposing(true)}
                className="min-w-0 flex-1 truncate text-left font-sans text-[15px] text-ink-300"
              >
                What&rsquo;s on your mind?
              </button>
              <button
                type="button"
                onClick={() => setComposing(true)}
                className="shrink-0 rounded-full bg-ink-800 px-4 py-2 font-sans text-sm font-semibold text-white hover:bg-ink-700"
              >
                Post
              </button>
            </div>

            {view === "for_you" ? (
              <ConversationList
                key="for_you"
                query={{ view: "for_you" }}
                initial={firstPage}
                empty={<Empty>Nothing here yet. Start the first conversation.</Empty>}
              />
            ) : (
              <ConversationList
                key="following"
                query={{ view: "following" }}
                empty={
                  <Empty>
                    Unfinished stories you follow show up here. Tap Follow story on one to keep up with it.
                  </Empty>
                }
              />
            )}

            <FloatingCompose visible={pastPostBar} onClick={() => setComposing(true)} />
          </div>
        </div>
      </div>

      <RightRail />

      {composing && (
        <NewComposer onClose={() => setComposing(false)} />
      )}

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
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-2xl border border-dashed border-ink-100 px-6 py-10 text-center font-sans text-[15px] text-ink-400">
      {children}
    </p>
  );
}
