import Link from "next/link";
import { Avatar } from "@/components/app/Avatar";
import { getChapter } from "@/lib/chapters";
import { cn } from "@/lib/cn";
import { circleLabel, distanceLabel, eventDateLabel, type EventCard, type LiveRoom } from "@/lib/events";

/**
 * The Events rail — Figma frame 648:36642.
 *
 * Events replaces the feed rail with GROUV'D EVENTS (the ones you said yes to)
 * and YOUR LIVE MEET (the Meet & Greet room you are in). Below `rail` the
 * phone's "View Grouv'd Events" link (635:21551) opens the same cards on
 * /events/grouvd (635:23035).
 */
export function EventsRail({ events, room }: { events: EventCard[]; room: LiveRoom | null }) {
  return (
    <aside className="hidden w-[300px] shrink-0 scroll-slim overflow-y-auto bg-surface px-6 py-6 rail:block wide:w-[396px] wide:px-8">
      <div className="flex flex-col gap-7">
        <section className="flex flex-col gap-4">
          <h2 className="font-sans text-base font-medium text-ink-600">
            GROUV&rsquo;D EVENTS
          </h2>
          {events.length === 0 ? (
            <p className="font-sans text-sm text-ink-300">Events you say yes to show up here.</p>
          ) : (
            <ul className="flex flex-col gap-4">
              {events.map((event) => (
                <li key={event.id}>
                  <GrouvdEventCard event={event} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <span className="h-px w-full bg-ink-50" />

        <section className="flex flex-col gap-4">
          <h2 className="font-sans text-base font-medium text-ink-600">
            YOUR LIVE MEET
          </h2>
          {room ? (
            <LiveMeetCard room={room} />
          ) : (
            <p className="font-sans text-sm text-ink-300">
              You&rsquo;re not in a Meet &amp; Greet right now.
            </p>
          )}
        </section>
      </div>
    </aside>
  );
}

/**
 * A GROUV'D EVENTS card (648:36642, 635:23035): title with its Space and host,
 * who from your circle is going, then a rule over the date and venue.
 */
export function GrouvdEventCard({ event }: { event: EventCard }) {
  const distance = distanceLabel(event.distanceKm);
  return (
    <div className="flex flex-col gap-3 rounded-lg p-4" style={{ backgroundImage: "var(--wash-warm)" }}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href={`/events/${event.id}`}
          className="font-display text-[13.8px] leading-[1.26] font-semibold text-ink-500 hover:underline"
        >
          {event.title}
        </Link>
        <ChapterHost event={event} small />
      </div>

      <div className="flex items-center gap-3">
        <AttendeeStack avatars={event.attendeeAvatars.slice(0, 4)} />
        <span className="font-sans text-[11px] text-ink-400">{circleLabel(event)}</span>
      </div>

      <span className="h-px w-full bg-ink-50" />

      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 font-sans text-[10px] text-ink-400">
        <span className="flex items-center gap-1" suppressHydrationWarning>
          <TimerIcon className="size-3" />
          {eventDateLabel(event.startsAt)}
        </span>
        <span className="flex items-center gap-1">
          <PinIcon className="size-3" />
          {event.venueShort ?? event.venueName}
          {distance && (
            <>
              <Dot />
              {distance}
            </>
          )}
        </span>
      </div>
    </div>
  );
}

/** YOUR LIVE MEET (648:36642) — the pink card for the room you're in. */
export function LiveMeetCard({ room, onOpen }: { room: LiveRoom; onOpen?: () => void }) {
  const body = (
    <>
      <div className="flex w-full items-center justify-between gap-2">
        <span className="font-display text-[13.8px] leading-[1.26] font-semibold text-ink-500">
          {room.title}
        </span>
        <span className="flex items-center gap-1.5 font-sans text-xs font-medium text-success-60">
          <span className="size-2 rounded-full bg-success-60" />
          live
        </span>
      </div>
      <span className="font-sans text-[11px] text-ink-400">
        {room.hereCount} Meeting &amp; Greeting
      </span>
      {(room.venueName || room.communityLabel) && (
        <>
          <span className="h-px w-full bg-ink-50" />
          <div className="flex flex-wrap items-center gap-2 font-sans text-[10px] text-ink-400">
            {room.venueName && (
              <span className="flex items-center gap-1">
                <PinIcon className="size-3 text-primary-600" />
                {room.venueName}
              </span>
            )}
            {room.venueName && room.communityLabel && <Dot />}
            {room.communityLabel && <span>{room.communityLabel}</span>}
          </div>
        </>
      )}
    </>
  );

  const className = "flex w-full flex-col gap-2 rounded-lg p-4 text-left";
  const style = { backgroundImage: "var(--wash-pink)" };
  return onOpen ? (
    <button type="button" onClick={onOpen} className={className} style={style}>
      {body}
    </button>
  ) : (
    <div className={className} style={style}>
      {body}
    </div>
  );
}

/** Chapter chip (the Space's glyph + name), a dot, then the host's name. */
export function ChapterHost({ event, small = false }: { event: EventCard; small?: boolean }) {
  const chapter = getChapter(event.chapterSlug);
  const text = small ? "text-[10px]" : "text-xs";
  return (
    <span className="flex flex-wrap items-center gap-2">
      {chapter && (
        <span className={cn("flex items-center gap-1.5 font-sans font-medium text-ink-400", text)}>
          <span
            aria-hidden="true"
            className={cn("shrink-0 rounded-full bg-contain bg-center bg-no-repeat", small ? "size-3.5" : "size-4")}
            style={{ backgroundImage: `url(${chapter.icon})` }}
          />
          {chapter.name}
        </span>
      )}
      {chapter && event.hostName && <Dot />}
      {event.hostName && (
        <span className={cn("font-sans font-medium text-ink-400", text)}>{event.hostName}</span>
      )}
    </span>
  );
}

/** Overlapping photos of who from your circle is going. */
export function AttendeeStack({ avatars }: { avatars: string[] }) {
  if (avatars.length === 0) return null;
  return (
    <span className="flex shrink-0">
      {avatars.map((src, i) => (
        <span
          key={`${src}-${i}`}
          className="rounded-full border-2 border-surface"
          style={{ marginLeft: i === 0 ? 0 : -6 }}
        >
          <Avatar src={src} name="" sizes="24px" className="size-5" />
        </span>
      ))}
    </span>
  );
}

export function Dot() {
  return <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-primary-500" />;
}

export function TimerIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <circle cx="10" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 8v3l2 1.5M8 2.5h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CalendarIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <rect x="3" y="4.5" width="14" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 8.5h14M7 2.5v3M13 2.5v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function PinIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
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
