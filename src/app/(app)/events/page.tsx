"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { TopBar } from "@/components/app/TopBar";
import { EventsRail } from "@/components/app/EventsRail";
import { EmptyState } from "@/components/app/EmptyState";
import { Button } from "@/components/ui/Button";
import { MeetAndGreet } from "@/components/app/MeetAndGreet";
import { CreateEventModal } from "@/components/app/CreateEventModal";
import { useToast } from "@/components/app/ToastProvider";
import { cn } from "@/lib/cn";

/**
 * Events — Figma frame 354:6662 ("Gatherings").
 *
 * Tabs, a section header with search + Host an Event, then event cards. The
 * card copy is Figma's own, including its lorem-ipsum description placeholder.
 */
const TABS = ["Gatherings", "Meet & Greet"];

const ATTENDEES = [
  "/images/people/m1.png",
  "/images/people/m2.png",
  "/images/people/m3.png",
  "/images/people/m4.png",
  "/images/people/jalen.png",
];

type Rsvp = Record<number, boolean>;

const EVENTS = Array.from({ length: 4 }, (_, i) => ({
  id: i,
  title: "First Down Walk",
  host: "David",
  description:
    "“Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut”",
  date: "Friday, 28th August 2026",
  time: "10:00AM",
}));

export default function EventsPage() {
  const [tab, setTab] = useState(TABS[0]);
  const [going, setGoing] = useState<Rsvp>({});
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const toast = useToast();

  const visible = EVENTS.filter((e) =>
    query ? e.title.toLowerCase().includes(query.toLowerCase()) : true,
  );

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar />

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 lg:px-8">
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
              <MeetAndGreet onHost={() => setCreating(true)} />
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
                body="There are events hosting near you"
              />
            ) : (
            <ul className="flex flex-col gap-4">
              {visible.map((event) => (
                <li
                  key={event.id}
                  className="relative flex gap-2 rounded-lg bg-white p-4"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-50 text-primary-600">
                    <PlanetIcon />
                  </span>

                  <div className="flex min-w-0 flex-1 flex-col gap-2 pr-24">
                    <h2 className="font-sans text-sm font-semibold text-ink-600">
                      {/* Opens the Event View (452:9875). */}
                      <Link
                        href={`/events/${event.id}`}
                        className="hover:underline"
                      >
                        {event.title}
                      </Link>
                    </h2>

                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-primary-600" />
                      <span className="font-sans text-xs font-medium text-ink-400">
                        {event.host}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="flex">
                        {ATTENDEES.map((src, i) => (
                          <span
                            key={src}
                            className="relative size-6 overflow-hidden rounded-full border-2 border-white"
                            style={{ marginLeft: i === 0 ? 0 : -8 }}
                          >
                            <Image
                              src={src}
                              alt=""
                              fill
                              sizes="24px"
                              className="object-cover"
                            />
                          </span>
                        ))}
                      </span>
                    </div>

                    <p className="font-sans text-xs text-ink-400">
                      {event.description}
                    </p>

                    <div className="flex flex-wrap gap-2">
                      <Chip>{event.date}</Chip>
                      <Chip>{event.time}</Chip>
                    </div>
                  </div>

                  <div className="absolute top-4 right-4">
                    <button
                      type="button"
                      onClick={() => {
                        if (!going[event.id]) {
                          toast({
                            title: "You're grouv'd. ",
                            description: "See you at First Down Walk Event",
                          });
                        }
                        setGoing((prev) => ({
                          ...prev,
                          [event.id]: !prev[event.id],
                        }));
                      }}
                      aria-pressed={!!going[event.id]}
                      className={cn(
                        "flex items-center gap-2 rounded-full px-3 py-2.5 font-ui text-sm font-medium transition-colors",
                        going[event.id]
                          ? "bg-primary-50 text-primary-800"
                          : "text-primary-600 hover:bg-primary-50",
                      )}
                    >
                      {going[event.id] ? "You're grouv'd" : "I'll Grouv"}
                      <ArrowIcon />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            )}
            </>
            )}
          </div>
        </div>
      </div>

      <EventsRail />

      {creating && <CreateEventModal onClose={() => setCreating(false)} />}
    </div>
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

function PlanetIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="size-5" aria-hidden="true">
      <circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M3.2 13.5c4.5 2.2 10.6 1.4 13.6-1.6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
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
