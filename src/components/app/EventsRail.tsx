import Link from "next/link";
import { Avatar } from "@/components/app/Avatar";
import { getChapter } from "@/lib/chapters";
import { eventDateLabel, type EventCard, type LiveRoom } from "@/lib/events";

/**
 * The Events rail — Figma frame 648:36642.
 *
 * Events replaces the feed rail with GROUV'D EVENTS (the ones you said yes to)
 * and YOUR LIVE MEET (the Meet & Greet room you are in).
 */
const WASH = "var(--wash-warm)";

export function EventsRail({ events, room }: { events: EventCard[]; room: LiveRoom | null }) {
  return (
    <aside className="hidden w-[396px] shrink-0 scroll-slim overflow-y-auto bg-surface px-8 py-6 xl:block">
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
                <li
                  key={event.id}
                  className="flex flex-col gap-2 rounded-lg p-4"
                  style={{ backgroundImage: WASH }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link
                      href={`/events/${event.id}`}
                      className="font-display text-[13.8px] leading-[1.26] font-semibold text-ink-500 hover:underline"
                    >
                      {event.title}
                    </Link>
                    <span className="flex items-center gap-2">
                      <span className="flex items-center gap-1 rounded-full bg-surface/70 px-2 py-0.5 font-sans text-[10px] font-medium text-ink-400">
                        <BagIcon />
                        {getChapter(event.chapterSlug)?.name}
                      </span>
                      {event.hostName && (
                        <span className="flex items-center gap-1 font-sans text-[10px] font-medium text-ink-400">
                          <span className="size-1.5 rounded-full bg-primary-600" />
                          {event.hostName}
                        </span>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {event.attendeeAvatars.length > 0 && (
                      <span className="flex shrink-0">
                        {event.attendeeAvatars.slice(0, 4).map((src, i) => (
                          <span
                            key={`${src}-${i}`}
                            className="rounded-full border-2 border-surface"
                            style={{ marginLeft: i === 0 ? 0 : -6 }}
                          >
                            <Avatar src={src} name="" sizes="24px" className="size-5" />
                          </span>
                        ))}
                      </span>
                    )}
                    <span className="font-sans text-[11px] text-ink-400">
                      {event.circleGoing > 0
                        ? `${event.circleGoing} of your circle have GROUV`
                        : `${event.goingCount} going`}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 font-sans text-[10px] text-ink-400">
                    <span className="flex items-center gap-1" suppressHydrationWarning>
                      <ClockIcon />
                      {eventDateLabel(event.startsAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      <PinIcon />
                      {event.venueShort ?? event.venueName}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="font-sans text-base font-medium text-ink-600">
            YOUR LIVE MEET
          </h2>
          {room ? (
            <div className="flex flex-col gap-2 rounded-lg p-4" style={{ backgroundImage: WASH }}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-display text-[13.8px] leading-[1.26] font-semibold text-ink-500">
                  {room.title}
                </span>
                <span className="flex items-center gap-1.5 font-sans text-[10px] font-medium text-success-60">
                  <span className="size-2 rounded-full bg-success-60" />
                  live
                </span>
              </div>
              <span className="font-sans text-[11px] text-ink-400">
                {room.hereCount} Meeting &amp; Greeting
              </span>
              {(room.venueName || room.communityLabel) && (
                <div className="flex flex-wrap items-center gap-3 font-sans text-[10px] text-ink-400">
                  {room.venueName && (
                    <span className="flex items-center gap-1">
                      <PinIcon />
                      {room.venueName}
                    </span>
                  )}
                  {room.communityLabel && (
                    <span className="flex items-center gap-1">
                      <span className="size-1.5 rounded-full bg-primary-600" />
                      {room.communityLabel}
                    </span>
                  )}
                </div>
              )}
            </div>
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

function BagIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="size-3" aria-hidden="true">
      <path
        d="M2 5.5h12v8H2v-8ZM5.5 5.5V4a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1.5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="size-3" aria-hidden="true">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3" />
      <path d="M8 5v3l2 1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="size-3" aria-hidden="true">
      <path
        d="M8 1.5a4.5 4.5 0 0 1 4.5 4.5c0 3.2-4.5 8.5-4.5 8.5S3.5 9.2 3.5 6A4.5 4.5 0 0 1 8 1.5Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="6" r="1.4" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}
