"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Avatar } from "@/components/app/Avatar";
import { Glyph } from "@/components/app/EventsView";
import { ConfirmDialog, RoomComposer, RoomMessageList, useRoomMessages } from "@/components/app/RoomChat";
import { useToast } from "@/components/app/ToastProvider";
import { TopBar } from "@/components/app/TopBar";
import { Button } from "@/components/ui/Button";
import { cancelEvent, setRsvp } from "@/app/(app)/events/actions";
import { getChapter } from "@/lib/chapters";
import { cn } from "@/lib/cn";
import {
  capacityPercent,
  distanceLabel,
  eventDateLabel,
  eventTimeLabel,
  isFull,
  mapUrl,
  type Attendee,
  type EventCard,
} from "@/lib/events";

/**
 * Event View — Figma frame 452:9875.
 *
 * A 724px conversation panel with the "group created" notice above the
 * messages, a "Join conversation" composer pinned to the bottom of the column,
 * and a 396px rail holding EVENT DETAILS and the ATTENDEE LIST (452:11307).
 * The phone frames turn that rail into an "Event Details" tab (635:24106
 * Conversation, 635:24424 Event Details, where the rows sit on white cards).
 * A full event shows "Capacity reached" to anyone not already going.
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
  const full = !event.going && isFull(event);

  const rsvp = (going: boolean) =>
    startTransition(async () => {
      const result = await setRsvp(event.id, going);
      if (result.error) return toast({ title: result.error, tone: "danger" });
      if (going) toast({ title: "You're grouv'd.", description: `See you at ${event.title}` });
    });

  const details = (carded: boolean) => (
    <EventDetails
      carded={carded}
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
          <div role="tablist" className="mx-auto mb-6 flex w-full max-w-[724px] rail:hidden">
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
            <div className="mx-auto w-full max-w-[724px] rail:hidden">{details(true)}</div>
          )}

          <section
            className={cn(
              // The phone draws the messages straight on the page (635:24106).
              "mx-auto w-full max-w-[724px] flex-col items-center gap-4 lg:rounded-2xl lg:bg-surface lg:p-6",
              tab === "Conversation" ? "flex" : "hidden rail:flex",
            )}
          >
            <EventSummary event={event} isHost={isHost} />

            {isHost && !cancelled && (
              <div className="flex w-full items-start gap-4 rounded-2xl bg-primary-50 p-4 sm:p-5">
                <LockIcon />
                <span className="flex flex-col gap-1">
                  <span className="font-sans text-lg font-medium text-primary-600">Host access</span>
                  <span className="font-sans text-sm text-primary-600">
                    You&rsquo;re hosting {event.title}. Full conversation below
                  </span>
                </span>
              </div>
            )}

            {event.going ? (
              <RoomMessageList
                messages={chat.messages}
                hostId={event.hostId}
                empty="No messages yet. Say hello to everyone going."
                chat={cancelled ? undefined : chat}
              />
            ) : (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <p className="font-sans text-sm text-ink-300">
                  The conversation is for people going to this event.
                </p>
                {!cancelled && (
                  <Button size="sm" onClick={() => rsvp(true)} loading={pending} disabled={full}>
                    {full ? "Capacity reached" : "I'll Grouv"}
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
              "shrink-0 border-t border-ink-50 bg-surface px-4 py-5 lg:px-8",
              tab === "Conversation" ? "block" : "hidden rail:block",
            )}
          >
            <RoomComposer
              placeholder="Join conversation"
              onSend={chat.send}
              sending={chat.sending}
              conversationId={event.conversationId}
              replyTo={chat.replyTo}
              onCancelReply={() => chat.setReplyTo(null)}
            />
          </div>
        )}
      </div>

      {/* Sidebar 452:11307 — 396px, scrolls on its own. */}
      <aside className="hidden w-[300px] shrink-0 flex-col gap-7 scroll-slim overflow-y-auto bg-surface px-6 pt-6 pb-10 rail:flex wide:w-[396px] wide:px-8">
        {details(false)}
      </aside>
    </div>
  );
}

/** The rail's contents — a column on desktop, a tab on the phone. */
function EventDetails({
  carded,
  event,
  attendees,
  isHost,
  onRsvp,
  pending,
  full,
}: {
  /** The phone tab puts the rows and the attendees on white cards (635:24424). */
  carded: boolean;
  event: EventCard;
  attendees: Attendee[];
  isHost: boolean;
  onRsvp: (going: boolean) => void;
  pending: boolean;
  full: boolean;
}) {
  const cancelled = event.status === "cancelled";
  const card = carded ? "rounded-lg bg-surface p-4" : "";
  const distance = distanceLabel(event.distanceKm);

  return (
    <div className="flex flex-col gap-7">
      <section className="flex flex-col gap-4">
        <h2 className="font-sans text-base font-semibold text-ink-700">
          EVENT DETAILS
        </h2>
        <div className={cn("flex flex-col", card)} suppressHydrationWarning>
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
            <span className="flex items-baseline justify-between gap-3">
              <Value>{event.venueName}</Value>
              {distance && <span className="shrink-0 font-sans text-sm text-ink-200">{distance}</span>}
            </span>
            {event.latitude !== null && event.longitude !== null && (
              <a
                href={mapUrl(event.latitude, event.longitude)}
                target="_blank"
                rel="noreferrer"
                className="font-sans text-sm font-medium text-primary-600 hover:underline"
              >
                Open in map
              </a>
            )}
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
                {full ? "Capacity reached" : "I'll Grouv"}
              </Button>
            )}
            {/* The host deletes the event from the conversation's menu (1784:38023). */}
          </div>
        )}
      </section>

      {!carded && <span className="h-px w-full bg-ink-50" />}

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-3">
          <h2 className="font-sans text-base font-semibold text-ink-700">
            ATTENDEE LIST
          </h2>
          <div className="flex items-center gap-3">
            <span className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-primary-50">
              <span
                className="block h-full rounded-full bg-primary-500"
                style={{ width: `${capacityPercent(event)}%` }}
              />
            </span>
            <span className="shrink-0 font-sans text-xs font-medium text-ink-400">
              {event.goingCount}/{event.capacity} Grouving
            </span>
          </div>
          {isFull(event) && (
            <p className="font-sans text-xs font-medium text-primary-600">Capacity reached</p>
          )}
          <p className="font-sans text-xs text-ink-300">
            {isHost ? "As the host, you can see everyone going" : "Only people in your Circle are visible here"}
          </p>
        </div>

        {attendees.length === 0 ? (
          <p className={cn("font-sans text-sm text-ink-300", card)}>No one from your circle is going yet.</p>
        ) : (
          <ul className={cn("flex flex-col", card)}>
            {attendees.map((person) => (
              <li key={person.userId} className="flex items-center gap-3 px-1 py-2">
                <Avatar src={person.avatarUrl} name={person.name} userId={person.userId} sizes="32px" className="size-8" />
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

/**
 * The top of the conversation (1779:27909 / 1801:33753): what the event is
 * about, who's going, its status chip, and the host's menu with Delete Event
 * (1784:38023 → 1784:38047). Deleting cancels it; everyone going is told.
 */
function EventSummary({ event, isHost }: { event: EventCard; isHost: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [menu, setMenu] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const cancelled = event.status === "cancelled";
  const [now] = useState(() => Date.now());
  const status = cancelled ? "Cancelled" : new Date(event.startsAt).getTime() > now ? "Upcoming" : "Started";

  useEffect(() => {
    if (!menu) return;
    const onPointer = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false);
    };
    const id = setTimeout(() => document.addEventListener("mousedown", onPointer));
    return () => {
      clearTimeout(id);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [menu]);

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex items-start gap-3">
        <p className="min-w-0 flex-1 font-sans text-base whitespace-pre-line text-ink-700">
          {event.description ?? `A ${getChapter(event.chapterSlug)?.name ?? ""} gathering.`}
        </p>
        {isHost && !cancelled && (
          <div ref={menuRef} className="relative shrink-0">
            <button
              type="button"
              aria-label="Event options"
              aria-haspopup="menu"
              aria-expanded={menu}
              onClick={() => setMenu((v) => !v)}
              className="grid size-8 place-items-center rounded-full text-ink-700 transition-colors hover:bg-ivory-200"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="size-5" aria-hidden="true">
                <circle cx="10" cy="4.5" r="1.6" />
                <circle cx="10" cy="10" r="1.6" />
                <circle cx="10" cy="15.5" r="1.6" />
              </svg>
            </button>
            {menu && (
              <div
                role="menu"
                className="absolute top-full right-0 z-20 mt-1 flex w-[220px] flex-col rounded-lg bg-surface py-2 shadow-[0px_0px_36px_0px_rgba(0,0,0,0.15)]"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenu(false);
                    setConfirming(true);
                  }}
                  className="px-4 py-2 text-left font-sans text-sm font-medium text-destructive-60 transition-colors hover:bg-ivory-200"
                >
                  Delete Event
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      <span className="flex items-center gap-1.5">
        {event.attendeeAvatars.length > 0 && (
          <span className="flex -space-x-2">
            {event.attendeeAvatars.slice(0, 4).map((src, i) => (
              <Avatar key={i} src={src} name="" sizes="24px" className="size-6 ring-2 ring-surface" />
            ))}
          </span>
        )}
        <span className="font-sans text-xs text-ink-500">
          {event.goingCount} going to this event
        </span>
      </span>
      <span
        className={cn(
          "flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 font-sans text-xs",
          cancelled ? "bg-destructive-5 text-destructive-60" : "bg-ivory-200 text-ink-500",
        )}
      >
        <span className={cn("size-1.5 rounded-full", cancelled ? "bg-destructive-60" : "bg-primary-500")} />
        {status}
      </span>

      {confirming && (
        <ConfirmDialog
          title="Delete this Event?"
          body="Are you sure you want to delete this event? This action cannot be undone, and all attendees registered for the event will be notified."
          confirm="Delete Event"
          onCancel={() => setConfirming(false)}
          onConfirm={async () => {
            const result = await cancelEvent(event.id);
            if (result.error) {
              toast({ title: result.error, tone: "danger" });
              return;
            }
            setConfirming(false);
            toast({ title: "Event deleted", description: "Everyone going has been told.", tone: "danger" });
            router.push("/events");
          }}
        />
      )}
    </div>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-7 shrink-0 text-primary-600" aria-hidden="true">
      <rect x="4" y="10" width="16" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14.5v2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
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
