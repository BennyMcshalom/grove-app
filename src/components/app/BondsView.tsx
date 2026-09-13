"use client";

import { useState } from "react";
import { Avatar } from "@/components/app/Avatar";
import { BondChat, GlowAvatar, ChapterBadge } from "@/components/app/BondChat";
import { BondsRail, PendingCard, SuggestionCard } from "@/components/app/BondsRail";
import { useIsOnline } from "@/components/app/Presence";
import { useCollapsedSidebar } from "@/components/app/SidebarProvider";
import type { BondPerson, PendingRequest, Suggestion } from "@/lib/bonds";
import { cn } from "@/lib/cn";

/**
 * Bonds — Figma frames 452:10158 (desktop) and 635:18535 / 635:19212 (phone).
 *
 * Three columns on desktop: a 296px conversation list (Your Bond / Your
 * Circle), the 525px chat pane, and a 300px details rail. The phone shows the
 * list first — with PENDING CONNECTION and PEOPLE YOU MIGHT KNOW above it —
 * and opens the chat full screen.
 */
type Activity = Pick<BondPerson, "conversationId" | "lastMessage" | "unread">;

export function BondsView({
  people,
  pending,
  suggestions,
  openWith,
}: {
  people: BondPerson[];
  pending: PendingRequest[];
  suggestions: Suggestion[];
  openWith: string | null;
}) {
  // Three columns of our own — the list, the chat and the rail — so the app
  // sidebar starts as a rail here. The toggle in it still overrides this.
  useCollapsedSidebar();

  // The server list refreshes after accepting requests; what happens in an
  // open chat (new previews, cleared unread) is layered on top until then.
  const [activity, setActivity] = useState<Record<string, Partial<Activity>>>({});
  const merged = people.map((p) => ({ ...p, ...activity[p.userId] }));
  const bonds = merged.filter((p) => p.relationship === "bond");
  const circle = merged.filter((p) => p.relationship === "circle");

  const [selectedId, setSelectedId] = useState<string | null>(openWith ?? merged[0]?.userId ?? null);
  // On a phone the list and the chat are separate screens (635:18535 vs
  // 635:19212); on desktop both panes are on screen at once.
  const [chatOpen, setChatOpen] = useState(openWith !== null);
  const [pendingShown, setPendingShown] = useState<string | null>(null);
  const [allSuggestions, setAllSuggestions] = useState(false);
  const selected = merged.find((p) => p.userId === selectedId) ?? null;

  const open = (userId: string) => {
    setSelectedId(userId);
    setChatOpen(true);
  };

  const [firstSuggestion] = suggestions;
  const shownPending = pending.find((p) => p.requestId === pendingShown);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Figma 452:10233 — this section titles the bar rather than showing tabs. */}
      <header
        className={cn(
          "shrink-0 items-center justify-between bg-white px-5 py-6 md:flex md:px-8",
          chatOpen ? "hidden" : "flex",
        )}
      >
        <h1 className="font-display text-2xl font-semibold text-ink-600">Bonds</h1>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <nav
          className={cn(
            "w-full shrink-0 flex-col scroll-slim overflow-y-auto border-r border-ink-50 bg-ivory-300 md:flex md:w-[256px] xl:w-[296px]",
            chatOpen ? "hidden" : "flex",
          )}
        >
          {/* Frame 635:18535 — the phone leads with these two sections. */}
          {pending.length > 0 && (
            <section className="flex flex-col gap-4 bg-ivory-100 px-4 py-4 md:hidden">
              <h2 className="font-sans text-base font-medium text-ink-600">
                PENDING CONNECTION
              </h2>
              <ul className="-mx-4 flex gap-4 overflow-x-auto px-4">
                {pending.map((request) => (
                  <li key={request.requestId} className="w-20 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        setPendingShown((id) => (id === request.requestId ? null : request.requestId))
                      }
                      aria-expanded={pendingShown === request.requestId}
                      className="flex w-full flex-col items-center gap-2"
                    >
                      <GlowAvatar src={request.avatarUrl} name={request.name} />
                      <span className="w-full truncate text-center font-sans text-xs text-ink-500">
                        {request.name}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              {shownPending && (
                <div className="flex flex-col gap-3 rounded-lg bg-white p-3">
                  <PendingCard key={shownPending.requestId} request={shownPending} />
                </div>
              )}
            </section>
          )}

          {firstSuggestion && (
            <section className="flex flex-col gap-4 bg-ivory-100 px-4 pb-4 md:hidden">
              <div className="flex items-center justify-between gap-4 pt-4">
                <h2 className="font-sans text-base font-medium text-ink-600">
                  PEOPLE YOU MIGHT KNOW
                </h2>
                {suggestions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setAllSuggestions((v) => !v)}
                    className="shrink-0 font-sans text-sm font-medium text-primary-500"
                  >
                    {allSuggestions ? "Show less" : "See all"}
                  </button>
                )}
              </div>
              {allSuggestions ? (
                <ul className="flex flex-col gap-3">
                  {suggestions.map((person) => (
                    <li key={person.userId} className="flex flex-col gap-3 rounded-lg bg-white p-3">
                      <SuggestionCard person={person} />
                    </li>
                  ))}
                </ul>
              ) : (
                <div
                  className="flex flex-col gap-2 rounded-lg p-4"
                  style={{
                    backgroundImage:
                      "linear-gradient(-7deg, rgba(254,230,215,1) 0%, rgba(254,251,249,1) 100%)",
                  }}
                >
                  <span className="font-sans text-sm font-semibold text-ink-700">
                    {firstSuggestion.name}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="flex shrink-0">
                      {[firstSuggestion.avatarUrl, ...firstSuggestion.mutualAvatars].slice(0, 5).map((src, i) => (
                        <span
                          key={`${src}-${i}`}
                          className="rounded-full border-2 border-white"
                          style={{ marginLeft: i === 0 ? 0 : -8 }}
                        >
                          <Avatar
                            src={src}
                            name={i === 0 ? firstSuggestion.name : ""}
                            sizes="32px"
                            className="size-7"
                          />
                        </span>
                      ))}
                    </span>
                    <span className="font-sans text-xs text-ink-400">
                      {firstSuggestion.mutualCount > 0
                        ? `${firstSuggestion.mutualCount} ${firstSuggestion.mutualCount === 1 ? "person" : "people"} in your circle know ${firstSuggestion.name}`
                        : `Also holding a chapter with you`}
                    </span>
                  </div>
                </div>
              )}
            </section>
          )}

          <section className="flex flex-col gap-3 bg-white pt-4">
            <h2 className="px-4 font-sans text-base font-medium text-ink-600">
              YOUR BOND
            </h2>
            {bonds.length === 0 ? (
              <p className="px-4 pb-4 font-sans text-sm text-ink-300">
                No bonds yet. Invite someone from a space&rsquo;s Ask Members tab.
              </p>
            ) : (
              <ul>
                {bonds.map((bond) => (
                  <li key={bond.userId}>
                    <BondRow
                      person={bond}
                      active={bond.userId === selectedId}
                      onOpen={() => open(bond.userId)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="flex flex-col bg-white pt-4">
            <h2 className="px-4 py-3 font-sans text-base font-medium text-ink-600">
              YOUR CIRCLE
            </h2>
            {circle.length === 0 ? (
              <p className="px-4 pb-4 font-sans text-sm text-ink-300">
                Your circle is empty. Connect with people in your spaces.
              </p>
            ) : (
              <ul>
                {circle.map((person) => (
                  <li key={person.userId}>
                    <CircleRow
                      person={person}
                      active={person.userId === selectedId}
                      onOpen={() => open(person.userId)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </nav>

        <div
          className={cn(
            "min-h-0 min-w-0 flex-1 md:flex",
            chatOpen ? "flex" : "hidden",
          )}
        >
          {selected ? (
            <BondChat
              key={selected.userId}
              person={selected}
              onBack={() => setChatOpen(false)}
              onActivity={({ conversationId, lastMessage, read }) =>
                setActivity((prev) => ({
                  ...prev,
                  [selected.userId]: {
                    ...prev[selected.userId],
                    conversationId,
                    ...(lastMessage && { lastMessage }),
                    ...(read && { unread: 0 }),
                  },
                }))
              }
            />
          ) : (
            <p className="m-auto max-w-[260px] text-center font-sans text-sm text-ink-300">
              Choose someone from your bonds or circle to talk to.
            </p>
          )}
        </div>

        <BondsRail pending={pending} suggestions={suggestions} />
      </div>
    </div>
  );
}

function BondRow({
  person,
  active,
  onOpen,
}: {
  person: BondPerson;
  active: boolean;
  onOpen: () => void;
}) {
  const online = useIsOnline(person.userId);
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-current={active ? "true" : undefined}
      className={cn(
        "flex w-full flex-col gap-2 border-b border-ink-50 px-4 py-3 text-left transition-colors",
        active ? "bg-primary-50" : "bg-white hover:bg-ivory-100",
      )}
    >
      <span className="flex items-center gap-3">
        <GlowAvatar src={person.avatarUrl} name={person.name} online={online} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate font-sans text-base font-medium text-ink-700">
            {person.name}
          </span>
          {person.phase && <ChapterBadge chapterSlug={person.chapterSlug} label={person.phase} />}
        </span>
        {person.unread > 0 && <UnreadBadge count={person.unread} />}
      </span>
      <span className="flex items-center gap-4">
        <span className="font-sans text-sm font-medium text-ink-300">
          Bond Depth
        </span>
        <span className="h-1 flex-1 overflow-hidden rounded-full bg-ink-50">
          <span
            className="block h-full rounded-full bg-primary-600"
            style={{ width: `${person.depth}%` }}
          />
        </span>
      </span>
    </button>
  );
}

function CircleRow({
  person,
  active,
  onOpen,
}: {
  person: BondPerson;
  active: boolean;
  onOpen: () => void;
}) {
  const online = useIsOnline(person.userId);
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-current={active ? "true" : undefined}
      className={cn(
        "flex w-full items-center gap-3 border-b border-ink-50 px-4 py-3 text-left transition-colors",
        active ? "bg-primary-50" : "bg-white hover:bg-ivory-100",
      )}
    >
      <span className="flex min-w-0 flex-1 items-center gap-3">
        <GlowAvatar src={person.avatarUrl} name={person.name} online={online} />
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate font-sans text-base font-medium text-ink-700">
            {person.name}
          </span>
          {person.phase && <ChapterBadge chapterSlug={person.chapterSlug} label={person.phase} />}
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        {person.lastMessage && (
          <span className="font-sans text-sm font-medium text-ink-200" suppressHydrationWarning>
            {shortTime(person.lastMessage.at)}
          </span>
        )}
        {person.unread > 0 && <UnreadBadge count={person.unread} />}
      </span>
    </button>
  );
}

function UnreadBadge({ count }: { count: number }) {
  return (
    <span className="rounded-full bg-primary-600 px-1.5 py-0.5 font-sans text-xs text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}

const clock = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" });
const monthDay = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });

/** "12:25" today, "Apr 10" before that. */
function shortTime(iso: string) {
  const date = new Date(iso);
  return date.toDateString() === new Date().toDateString() ? clock.format(date) : monthDay.format(date);
}
