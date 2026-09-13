"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Avatar } from "@/components/app/Avatar";
import { Glyph } from "@/components/app/EventsView";
import { RoomComposer, RoomMessageList, useRoomMessages } from "@/components/app/RoomChat";
import { useToast } from "@/components/app/ToastProvider";
import { TopBar } from "@/components/app/TopBar";
import { Button } from "@/components/ui/Button";
import { cancelEvent, setRsvp } from "@/app/(app)/events/actions";
import { getChapter } from "@/lib/chapters";
import { cn } from "@/lib/cn";
import { eventDateLabel, eventTimeLabel, type Attendee, type EventCard } from "@/lib/events";

/**
 * Event View — Figma frame 452:9875.
 *
 * A 724px conversation panel with the "group created" notice above the
 * messages, a "Join conversation" composer pinned to the bottom of the column,
 * and a 396px rail holding EVENT DETAILS and the ATTENDEE LIST (452:11307).
 * The phone frame (635:24106) turns that rail into an "Event Details" tab.
 * The conversation is for people going; everyone else sees the RSVP.
 */
const TABS = ["Conversation", "Event Details"] as const;

export function EventView({
  event,
  attendees,
  isHost,
}: {
  event: EventCard;
  attendees: Attendee[];
  isHost: boolean;
}) {
  const toast = useToast();
  const [tab, setTab] = useState<(typeof TABS)[number]>(TABS[0]);
  const [pending, startTransition] = useTransition();
  const chat = useRoomMessages(event.conversationId, event.going);
  const cancelled = event.status === "cancelled";
  const full = !event.going && event.goingCount >= event.capacity;

  const rsvp = (going: boolean) =>
    startTransition(async () => {
      const result = await setRsvp(event.id, going);
      if (result.error) return toast({ title: result.error, tone: "danger" });
      if (going) toast({ title: "You're grouv'd.", description: `See you at ${event.title}` });
    });

  const details = (
    <EventDetails
      event={event}
      attendees={attendees}
      isHost={isHost}
      onRsvp={rsvp}
      pending={pending}
      full={full}
    />
  );

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar
          title={event.title}
          back="/events"
          icon={
            <Link
              href="/events"
              aria-label="Back to events"
              className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-50 text-primary-600 transition-colors hover:bg-primary-100"
            >
              <Glyph icon={event.icon} />
            </Link>
          }
        />

        <div className="min-h-0 flex-1 scroll-slim overflow-y-auto px-4 py-6 lg:px-8">
          <div role="tablist" className="mx-auto mb-6 flex w-full max-w-[724px] xl:hidden">
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={t === tab}
                onClick={() => setTab(t)}
                className={cn(
                  "h-10 flex-1 border-b-2 px-4 py-2 font-sans text-sm font-medium transition-colors",
                  t === tab
                    ? "border-primary-600 text-ink-800"
                    : "border-ivory-600 text-ink-500",
                )}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === "Event Details" && (
            <div className="mx-auto w-full max-w-[724px] xl:hidden">{details}</div>
          )}

          <section
            className={cn(
              "mx-auto w-full max-w-[724px] flex-col items-center gap-4 rounded-2xl bg-white p-6",
              tab === "Conversation" ? "flex" : "hidden xl:flex",
            )}
          >
            <p className="flex w-full max-w-[427px] items-start gap-2 rounded-xl border border-primary-200 bg-primary-50 p-2 font-sans text-sm text-ink-200">
              <InfoIcon className="size-5 shrink-0 text-primary-600" />
              {cancelled
                ? "This event has been cancelled."
                : `Group created for ${event.title}. ${event.goingCount} ${event.goingCount === 1 ? "person" : "people"} going so far.`}
            </p>

            {event.going ? (
              <RoomMessageList
                messages={chat.messages}
                hostId={event.hostId}
                empty="No messages yet. Say hello to everyone going."
              />
            ) : (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <p className="font-sans text-sm text-ink-300">
                  The conversation is for people going to this event.
                </p>
                {!cancelled && (
                  <Button size="sm" onClick={() => rsvp(true)} loading={pending} disabled={full}>
                    {full ? "This event is full" : "I'll Grouv"}
                  </Button>
                )}
              </div>
            )}
          </section>
        </div>

        {/* Frame 458:12096 — the composer sits under the panel, above a rule. */}
        {event.going && !cancelled && (
          <div
            className={cn(
              "shrink-0 border-t border-ink-50 bg-white px-4 py-5 lg:px-8",
              tab === "Conversation" ? "block" : "hidden xl:block",
            )}
          >
            <RoomComposer placeholder="Join conversation" onSend={chat.send} sending={chat.sending} />
          </div>
        )}
      </div>

      {/* Sidebar 452:11307 — 396px, scrolls on its own. */}
      <aside className="hidden w-[396px] shrink-0 flex-col gap-7 scroll-slim overflow-y-auto bg-white px-8 pt-6 pb-10 xl:flex">
        {details}
      </aside>
    </div>
  );
}

/** The rail's contents — a column on desktop, a tab on the phone. */
function EventDetails({
  event,
  attendees,
  isHost,
  onRsvp,
  pending,
  full,
}: {
  event: EventCard;
  attendees: Attendee[];
  isHost: boolean;
  onRsvp: (going: boolean) => void;
  pending: boolean;
  full: boolean;
}) {
  const toast = useToast();
  const [cancelling, startCancelling] = useTransition();
  const cancelled = event.status === "cancelled";

  return (
    <div className="flex flex-col gap-7">
      <section className="flex flex-col gap-4">
        <h2 className="font-sans text-base font-semibold text-ink-700">
          EVENT DETAILS
        </h2>
        <div className="flex flex-col" suppressHydrationWarning>
          <DetailRow icon={<UserIcon />} label="Organizer">
            <Value>{isHost ? "You" : (event.hostName ?? "—")}</Value>
          </DetailRow>
          <DetailRow icon={<TimerIcon />} label="Time">
            <Value>{eventTimeLabel(event.startsAt)}</Value>
          </DetailRow>
          <DetailRow icon={<CalendarIcon />} label="Date">
            <Value>{eventDateLabel(event.startsAt)}</Value>
          </DetailRow>
          <DetailRow icon={<PinIcon />} label="Where">
            <Value>{event.venueName}</Value>
          </DetailRow>
          <DetailRow icon={<FileIcon />} label="What is the event about, who is it for?">
            <Value>{event.description ?? `A ${getChapter(event.chapterSlug)?.name ?? ""} gathering.`}</Value>
          </DetailRow>
        </div>

        {!cancelled && (
          <div className="flex flex-wrap gap-2">
            {event.going ? (
              !isHost && (
                <Button variant="secondary" size="sm" onClick={() => onRsvp(false)} loading={pending}>
                  I can&rsquo;t make it
                </Button>
              )
            ) : (
              <Button size="sm" onClick={() => onRsvp(true)} loading={pending} disabled={full}>
                {full ? "Full" : "I'll Grouv"}
              </Button>
            )}
            {isHost && (
              <Button
                variant="tertiary"
                size="sm"
                loading={cancelling}
                onClick={() =>
                  startCancelling(async () => {
                    const result = await cancelEvent(event.id);
                    toast(result.error ? { title: result.error, tone: "danger" } : { title: "Event cancelled", tone: "danger" });
                  })
                }
              >
                Cancel event
              </Button>
            )}
          </div>
        )}
      </section>

      <span className="h-px w-full bg-ink-50" />

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-3">
          <h2 className="font-sans text-base font-semibold text-ink-700">
            ATTENDEE LIST
          </h2>
          <div className="flex items-center gap-3">
            <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-lg bg-ivory-500">
              <span
                className="block h-full rounded-lg bg-primary-500"
                style={{ width: `${Math.min(100, (event.goingCount / event.capacity) * 100)}%` }}
              />
            </span>
            <span className="shrink-0 font-sans text-xs font-medium text-ink-400">
              {event.goingCount}/{event.capacity} Grouving
            </span>
          </div>
          <p className="font-sans text-xs text-ink-300">
            {isHost ? "As the host, you can see everyone going" : "Only people in your Circle are visible here"}
          </p>
        </div>

        {attendees.length === 0 ? (
          <p className="font-sans text-sm text-ink-300">No one from your circle is going yet.</p>
        ) : (
          <ul className="flex flex-col">
            {attendees.map((person) => (
              <li key={person.userId} className="flex items-center gap-3 px-1 py-2">
                <Avatar src={person.avatarUrl} name={person.name} sizes="32px" className="size-8" />
                <span className="font-sans text-sm font-medium text-ink-400">
                  {person.name}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/** Table Content Cell 452:11528 — primary-50 glyph, label above value. */
function DetailRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-1 py-2">
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-50 text-primary-600">
        {icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-sans text-sm text-ink-200">{label}</span>
        {children}
      </span>
    </div>
  );
}

function Value({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-sans text-sm font-semibold whitespace-pre-line text-ink-500">
      {children}
    </span>
  );
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M10 9v4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="10" cy="6.5" r="0.9" fill="currentColor" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="size-4" aria-hidden="true">
      <circle cx="10" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4.5 16a5.5 5.5 0 0 1 11 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function TimerIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="size-4" aria-hidden="true">
      <circle cx="10" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 8v3l2 1.5M8 2.5h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="size-4" aria-hidden="true">
      <rect x="3" y="4.5" width="14" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 8.5h14M7 2.5v3M13 2.5v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="size-4" aria-hidden="true">
      <path
        d="M10 2.2a5.6 5.6 0 0 1 5.6 5.6c0 4.1-5.6 10.2-5.6 10.2S4.4 11.9 4.4 7.8A5.6 5.6 0 0 1 10 2.2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="7.8" r="1.9" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="size-4" aria-hidden="true">
      <path
        d="M11.5 2.5H6a1.5 1.5 0 0 0-1.5 1.5v12A1.5 1.5 0 0 0 6 17.5h8a1.5 1.5 0 0 0 1.5-1.5V6.5l-4-4Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M11.5 2.5v4h4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}
