import Image from "next/image";
import Link from "next/link";

/**
 * The Events rail — Figma frame 648:36642.
 *
 * Events replaces the feed rail with GROUV'D EVENTS (the ones you said yes to)
 * and YOUR LIVE MEET (the Meet & Greet room you are in).
 */
const MEMBERS = [
  "/images/people/m1.png",
  "/images/people/m2.png",
  "/images/people/m3.png",
  "/images/people/m5.png",
];

const GROUVD = Array.from({ length: 3 }, (_, i) => ({
  id: i,
  title: "First Down Walk",
  chapter: "Career",
  host: "David",
  circle: "12 of your circle have GROUV",
  date: "Friday, 28th August 2026",
  place: "TBS",
  distance: "1.4km away",
}));

export function EventsRail() {
  return (
    <aside className="hidden w-[396px] shrink-0 overflow-y-auto bg-white px-8 py-6 xl:block">
      <div className="flex flex-col gap-7">
        <section className="flex flex-col gap-4">
          <h2 className="font-sans text-base font-medium text-ink-600">
            GROUV&rsquo;D EVENTS
          </h2>
          <ul className="flex flex-col gap-4">
            {GROUVD.map((event) => (
              <li
                key={event.id}
                className="flex flex-col gap-2 rounded-lg p-4"
                style={{
                  backgroundImage:
                    "linear-gradient(-7deg, rgba(254,230,215,1) 0%, rgba(254,251,249,1) 100%)",
                }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link
                    href={`/events/${event.id}`}
                    className="font-display text-[13.8px] leading-[1.26] font-semibold text-ink-500 hover:underline"
                  >
                    {event.title}
                  </Link>
                  <span className="flex items-center gap-2">
                    <span className="flex items-center gap-1 rounded-full bg-white/70 px-2 py-0.5 font-sans text-[10px] font-medium text-ink-400">
                      <BagIcon />
                      {event.chapter}
                    </span>
                    <span className="flex items-center gap-1 font-sans text-[10px] font-medium text-ink-400">
                      <span className="size-1.5 rounded-full bg-primary-600" />
                      {event.host}
                    </span>
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="flex shrink-0">
                    {MEMBERS.map((src, i) => (
                      <span
                        key={src}
                        className="relative size-6 overflow-hidden rounded-full border-2 border-white"
                        style={{ marginLeft: i === 0 ? 0 : -6 }}
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
                    <span
                      className="grid size-6 shrink-0 place-items-center rounded-full border-2 border-white bg-primary-50 font-ui text-[10px] font-extrabold text-primary-600"
                      style={{ marginLeft: -6 }}
                    >
                      SL
                    </span>
                  </span>
                  <span className="font-sans text-[11px] text-ink-400">
                    {event.circle}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3 font-sans text-[10px] text-ink-400">
                  <span className="flex items-center gap-1">
                    <ClockIcon />
                    {event.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <PinIcon />
                    {event.place}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-primary-600" />
                    {event.distance}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="font-sans text-base font-medium text-ink-600">
            YOUR LIVE MEET
          </h2>
          <div
            className="flex flex-col gap-2 rounded-lg p-4"
            style={{
              backgroundImage:
                "linear-gradient(-7deg, rgba(254,230,215,1) 0%, rgba(254,251,249,1) 100%)",
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-display text-[13.8px] leading-[1.26] font-semibold text-ink-500">
                Creators Summit
              </span>
              <span className="flex items-center gap-1.5 font-sans text-[10px] font-medium text-success-60">
                <span className="size-2 rounded-full bg-success-60" />
                live
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="flex shrink-0">
                {MEMBERS.map((src, i) => (
                  <span
                    key={src}
                    className="relative size-6 overflow-hidden rounded-full border-2 border-white"
                    style={{ marginLeft: i === 0 ? 0 : -6 }}
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
                <span
                  className="grid size-6 shrink-0 place-items-center rounded-full border-2 border-white bg-primary-50 font-ui text-[10px] font-extrabold text-primary-600"
                  style={{ marginLeft: -6 }}
                >
                  SL
                </span>
              </span>
              <span className="font-sans text-[11px] text-ink-400">
                12 Meeting &amp; Greeting
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 font-sans text-[10px] text-ink-400">
              <span className="flex items-center gap-1">
                <PinIcon />
                Tafawa Balewa Square
              </span>
              <span className="flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-primary-600" />
                Founders &amp; Builders
              </span>
            </div>
          </div>
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
      <path
        d="M8 5v3l2 1"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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
