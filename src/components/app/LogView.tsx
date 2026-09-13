"use client";

import Image from "next/image";
import { useState } from "react";
import { Avatar } from "@/components/app/Avatar";
import { LogMemories, LogPrompt } from "@/components/app/LogPrompt";
import { LogRail } from "@/components/app/LogRail";
import { TopBar } from "@/components/app/TopBar";
import { ViewLogModal } from "@/components/app/ViewLogModal";
import { useViewer } from "@/components/app/ViewerProvider";
import { Button } from "@/components/ui/Button";
import { getChapter } from "@/lib/chapters";
import { cn } from "@/lib/cn";
import type { CircleLog, LogEntry } from "@/lib/log";
import type { LogVisibility } from "@/lib/profile";

/**
 * Grouv Log — Figma frame 246:6062.
 *
 * A 708px centred column: today's prompt card, your logged memories, then a
 * "Log from your circle" list where each row shows a member and three of
 * their recent entries (frame 249:12722). The chapter tabs are the chapters
 * you hold; Solo / Bond Log switches between your own log and the ones you
 * share with bonds.
 */
const SCOPES = [
  { value: "solo", label: "Solo" },
  { value: "bond", label: "Bond Log" },
] as const;

export function LogView({
  entries,
  circleSolo,
  circleBond,
  prompts,
  bonds,
  visibility,
  weekStart,
}: {
  entries: LogEntry[];
  circleSolo: CircleLog[];
  circleBond: CircleLog[];
  prompts: Record<string, { id: string; body: string }>;
  bonds: { bondId: string; name: string }[];
  visibility: LogVisibility;
  /** The first calendar day of the last seven, for "days logged this week". */
  weekStart: string;
}) {
  const viewer = useViewer();
  const [slug, setSlug] = useState(viewer.chapters[0]?.slug ?? null);
  const [scope, setScope] = useState<"solo" | "bond">("solo");
  const [viewing, setViewing] = useState<CircleLog | null>(null);

  const held = viewer.chapters.find((c) => c.slug === slug);
  const chapter = slug ? getChapter(slug) : undefined;

  if (!held || !chapter) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <TopBar title="Grouv Log" />
        <div className="m-auto flex max-w-[360px] flex-col items-center gap-3 p-6 text-center">
          <p className="font-sans text-base text-ink-400">
            Your log lives inside your chapters. Open one to start logging moments.
          </p>
          <Button size="sm" href="/spaces">
            Go to My Spaces
          </Button>
        </div>
      </div>
    );
  }

  const mine = entries.filter((e) => e.chapterSlug === slug && e.scope === scope);
  const circle = (scope === "solo" ? circleSolo : circleBond).filter((log) => log.entries.length > 0);

  // Distinct days logged in this chapter over the last seven.
  const daysThisWeek = new Set(
    entries.filter((e) => e.chapterSlug === slug && e.entryDate >= weekStart).map((e) => e.entryDate),
  ).size;

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar title="Grouv Log" />

        <div className="min-h-0 flex-1 scroll-slim overflow-y-auto px-4 py-6 lg:px-8">
          <div className="mx-auto flex w-full max-w-[708px] flex-col items-center gap-8 pb-10">
            <div className="flex w-full flex-wrap items-center justify-between gap-4">
              <nav aria-label="Log chapter" className="flex min-w-0 flex-1 overflow-x-auto">
                {viewer.chapters.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    aria-current={c.slug === slug ? "page" : undefined}
                    onClick={() => setSlug(c.slug)}
                    className={cn(
                      "h-10 flex-1 border-b-2 px-4 py-2 font-sans text-sm font-medium whitespace-nowrap transition-colors",
                      c.slug === slug
                        ? "border-primary-600 text-ink-500"
                        : "border-ivory-600 text-ink-400 hover:text-ink-500",
                    )}
                  >
                    {getChapter(c.slug)?.name ?? c.slug}
                  </button>
                ))}
              </nav>

              <div
                role="tablist"
                aria-label="Log scope"
                className="flex shrink-0 rounded-full bg-ivory-300 p-1"
              >
                {SCOPES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    role="tab"
                    aria-selected={s.value === scope}
                    onClick={() => setScope(s.value)}
                    className={cn(
                      "rounded-full px-4 py-1.5 font-sans text-sm font-medium transition-colors",
                      s.value === scope
                        ? "bg-white text-ink-700 shadow-sm"
                        : "text-ink-400 hover:text-ink-600",
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <LogPrompt
              key={`${held.id}-${scope}`}
              chapterName={chapter.name}
              userChapterId={held.id}
              prompt={prompts[chapter.slug] ?? { id: "", body: "One honest moment from today" }}
              scope={scope}
              bonds={bonds}
            />
            <LogMemories key={`${slug}-${scope}`} entries={mine} />

            <section className="flex w-full flex-col gap-5">
              <header className="flex flex-col gap-1">
                <h2 className="font-display text-2xl font-semibold text-ink-800">
                  {scope === "solo" ? "Log from your circle" : "Logs from your bonds"}
                </h2>
                <p className="font-sans text-base text-ink-400">
                  Different lives, different phase
                </p>
              </header>

              {circle.length === 0 ? (
                <p className="rounded-3xl bg-white px-4 py-6 text-center font-sans text-sm text-ink-300">
                  {scope === "solo"
                    ? "When people in your circle log moments they share with you, they show up here."
                    : "Moments your bonds share with you show up here."}
                </p>
              ) : (
                <div className="flex flex-col gap-6">
                  {circle.map((member) => (
                    <article
                      key={member.userId}
                      className="flex flex-col gap-2 rounded-3xl bg-white px-4 py-3"
                    >
                      <div className="flex items-center gap-6 p-2">
                        <Avatar src={member.avatarUrl} name={member.name} sizes="48px" className="size-12" />
                        <span className="flex min-w-0 flex-col gap-0.5">
                          <span className="truncate font-sans text-base font-semibold text-ink-700">
                            {member.name}
                          </span>
                          <span className="truncate font-sans text-sm text-ink-300">
                            {member.phase}
                          </span>
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        {member.entries.slice(0, 3).map((entry) => (
                          <div
                            key={entry.id}
                            className="relative aspect-[3/4] overflow-hidden rounded-[20px] border border-ink-100 bg-ivory-100"
                          >
                            {entry.photoUrl ? (
                              <Image src={entry.photoUrl} alt="" fill unoptimized className="object-cover" />
                            ) : (
                              <p className="absolute inset-0 overflow-hidden p-3 font-sans text-xs leading-snug text-ink-600">
                                {entry.body}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-center py-1">
                        <button
                          type="button"
                          onClick={() => setViewing(member)}
                          className="flex items-center gap-2 rounded-full px-3 py-2.5 font-ui text-sm text-primary-800 transition-colors hover:bg-primary-50"
                        >
                          View log
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            className="size-4"
                            aria-hidden="true"
                          >
                            <path
                              d="m9 5 7 7-7 7"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>

      <LogRail
        chapterName={chapter.name}
        chapterIcon={chapter.icon}
        phase={held.phase}
        daysThisWeek={daysThisWeek}
        visibility={visibility}
      />

      {viewing && <ViewLogModal log={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}
