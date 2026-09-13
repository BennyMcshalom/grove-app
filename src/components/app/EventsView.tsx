"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { Avatar } from "@/components/app/Avatar";
import { TopBar } from "@/components/app/TopBar";
import { EventsRail } from "@/components/app/EventsRail";
import { EmptyState } from "@/components/app/EmptyState";
import { Button } from "@/components/ui/Button";
import { MeetAndGreet } from "@/components/app/MeetAndGreet";
import { CreateEventModal } from "@/components/app/CreateEventModal";
import { useToast } from "@/components/app/ToastProvider";
import { setRsvp, touchLiveRoom } from "@/app/(app)/events/actions";
import { cn } from "@/lib/cn";
import { eventDateLabel, eventTimeLabel, type EventCard, type LiveRoom } from "@/lib/events";

/**
 * Events — Figma frame 354:6662 ("Gatherings").
 *
 * Tabs, a section header with search + Host an Event, then event cards —
 * events in your spaces first, then soonest.
 */
const TABS = ["Gatherings", "Meet & Greet"] as const;

/** While you're in a Meet & Greet room, stay listed in it. */
const HEARTBEAT_MS = 2 * 60 * 1000;

export function EventsView({ events, rooms }: { events: EventCard[]; rooms: LiveRoom[] }) {
  const [tab, setTab] = useState<(typeof TABS)[number]>(TABS[0]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);

  const myRoom = rooms.find((r) => r.here) ?? null;
  useEffect(() => {
    if (!myRoom) return;
    const timer = setInterval(() => void touchLiveRoom(myRoom.id), HEARTBEAT_MS);
    return () => clearInterval(timer);
  }, [myRoom]);

  const needle = query.trim().toLowerCase();
  const visible = events.filter((e) =>
    needle ? `${e.title} ${e.venueName}`.toLowerCase().includes(needle) : true,
  );

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar title="Events" back="/home" />

        <div className="min-h-0 flex-1 scroll-slim overflow-y-auto px-4 py-4 lg:px-8">
          <div className="mx-auto flex w-full max-w-[724px] flex-col gap-6 pb-10">
            <nav className="flex" aria-label="Event type">
              {TABS.map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setTab(label)}
                  aria-current={tab === label ? "page" : undefined}
                  className={cn(
                    "flex h-10 flex-1 items-center justify-center px-4 font-sans text-sm font-medium transition-colors",
                    tab === label
                      ? "border-b-2 border-primary-600 text-ink-500"
                      : "border-b-2 border-ivory-600 text-ink-500",
                  )}
                >
                  {label}
                </button>
              ))}
            </nav>

            {tab === "Meet & Greet" ? (
              <MeetAndGreet rooms={rooms} onHost={() => setCreating(true)} />
            ) : (
            <>
            <header className="flex flex-wrap items-center justify-between gap-3">
              <h1 className="font-sans text-base font-medium tracking-wide text-ink-300 uppercase">
                Events near you
              </h1>
              <div className="flex items-center gap-5">
                <button
                  type="button"
                  aria-label="Search events"
                  aria-expanded={searchOpen}
                  onClick={() => setSearchOpen((v) => !v)}
                  className="grid size-10 place-items-center rounded-full bg-white text-ink-400 transition-colors hover:bg-ivory-200"
                >
                  <SearchIcon />
                </button>
                <Button size="sm" onClick={() => setCreating(true)}>
                  Host an Event
                </Button>
              </div>
            </header>

            {searchOpen && (
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search events"
                className="w-full rounded-full border border-ink-100 bg-white px-5 py-3 font-sans text-sm text-ink-500 outline-none placeholder:text-ink-200 focus:border-primary-200"
              />
            )}

            {visible.length === 0 ? (
              <EmptyState
                variant="screen"
                title="No Events"
                body={needle ? "No events match that search" : "There are no events coming up yet"}
              />
            ) : (
            <ul className="flex flex-col gap-4">
              {visible.map((event) => (
                <li key={event.id}>
                  <EventRow event={event} />
                </li>
              ))}
            </ul>
            )}
            </>
            )}
          </div>
        </div>
      </div>

      <EventsRail events={events.filter((e) => e.going)} room={myRoom} />

      {creating && <CreateEventModal onClose={() => setCreating(false)} />}
    </div>
  );
}

function EventRow({ event }: { event: EventCard }) {
  const toast = useToast();
  const [going, setGoing] = useState(event.going);
  const [pending, startTransition] = useTransition();
  const full = !going && event.goingCount >= event.capacity;

  return (
    <div className="relative flex gap-2 rounded-lg bg-white p-4">
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-50 text-primary-600">
        <Glyph icon={event.icon} />
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-2 pr-28">
        <h2 className="font-sans text-sm font-semibold text-ink-600">
          {/* Opens the Event View (452:9875). */}
          <Link href={`/events/${event.id}`} className="hover:underline">
            {event.title}
          </Link>
        </h2>

        {event.hostName && (
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-primary-600" />
            <span className="font-sans text-xs font-medium text-ink-400">
              {event.hostName}
            </span>
          </div>
        )}

        <div className="flex items-center gap-3">
          {event.attendeeAvatars.length > 0 && (
            <span className="flex">
              {event.attendeeAvatars.map((src, i) => (
                <span
                  key={`${src}-${i}`}
                  className="rounded-full border-2 border-white"
                  style={{ marginLeft: i === 0 ? 0 : -8 }}
                >
                  <Avatar src={src} name="" sizes="24px" className="size-5" />
                </span>
              ))}
            </span>
          )}
          <span className="font-sans text-xs text-ink-400">
            {event.goingCount} going
            {event.circleGoing > 0 && ` · ${event.circleGoing} from your circle`}
          </span>
        </div>

        {event.description && (
          <p className="line-clamp-2 font-sans text-xs text-ink-400">
            {event.description}
          </p>
        )}

        <div className="flex flex-wrap gap-2" suppressHydrationWarning>
          <Chip>{eventDateLabel(event.startsAt)}</Chip>
          <Chip>{eventTimeLabel(event.startsAt)}</Chip>
          <Chip>{event.venueName}</Chip>
        </div>
      </div>

      <div className="absolute top-4 right-4">
        <button
          type="button"
          disabled={pending || full}
          onClick={() =>
            startTransition(async () => {
              const next = !going;
              setGoing(next);
              const result = await setRsvp(event.id, next);
              if (result.error) {
                setGoing(!next);
                toast({ title: result.error, tone: "danger" });
                return;
              }
              if (next) {
                toast({ title: "You're grouv'd.", description: `See you at ${event.title}` });
              }
            })
          }
          aria-pressed={going}
          className={cn(
            "flex items-center gap-2 rounded-full px-3 py-2.5 font-ui text-sm font-medium transition-colors disabled:opacity-60",
            going
              ? "bg-primary-50 text-primary-800"
              : "text-primary-600 hover:bg-primary-50",
          )}
        >
          {going ? "You're grouv'd" : full ? "Full" : "I'll Grouv"}
          <ArrowIcon />
        </button>
      </div>
    </div>
  );
}

export function Glyph({ icon, className = "size-5" }: { icon: string; className?: string }) {
  return (
    <span
      className={cn("bg-current", className)}
      style={{
        maskImage: `url(/icons/events/${icon}.svg)`,
        WebkitMaskImage: `url(/icons/events/${icon}.svg)`,
        maskSize: "contain",
        WebkitMaskSize: "contain",
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskPosition: "center",
        WebkitMaskPosition: "center",
      }}
    />
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1 rounded-full bg-ivory-500 p-2 font-sans text-xs font-medium text-ink-400">
      {children}
    </span>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="size-5" aria-hidden="true">
      <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.6" />
      <path d="m13.5 13.5 3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="size-4" aria-hidden="true">
      <path
        d="M3 8h9m0 0-3.5-3.5M12 8l-3.5 3.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
