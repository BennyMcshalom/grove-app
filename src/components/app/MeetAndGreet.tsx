"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { LiveRoomModal } from "@/components/app/LiveRoomModal";

/**
 * Meet & Greet — Figma frame 367:8960 (the Events section's second tab).
 *
 * A "start one here" card whose button stays disabled until the place is
 * named, then LIVE NEAR YOU rooms. Copy is Figma's.
 */
const LIVE_ROOMS = Array.from({ length: 5 }, (_, i) => ({
  id: i,
  title: "Creators Summit",
  place: "Founders & Builders",
  here: 12,
}));

export function MeetAndGreet({ onHost }: { onHost?: () => void }) {
  const [place, setPlace] = useState("");
  // Tapping a room opens it (Figma 458:13190).
  const [joined, setJoined] = useState<(typeof LIVE_ROOMS)[number] | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-6 rounded-2xl bg-white p-5">
        <p className="font-sans text-xs tracking-wide text-ink-300 uppercase">
          Start a Meet &amp; Greet
        </p>

        <div className="flex flex-col gap-2">
          <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center">
            <input
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              placeholder="Name the place or event"
              className="flex-1 rounded-2xl bg-ivory-100 px-4 py-3 font-sans text-xs text-ink-500 outline-none placeholder:text-ink-300 focus:shadow-[0px_0px_0px_4px_rgba(249,189,152,0.25)]"
            />
            {/* Figma ships this button in its disabled variant (8:7265). */}
            <Button size="sm" className="px-6" disabled={!place.trim()}>
              Turn on here
            </Button>
          </div>
          <p className="font-sans text-xs text-ink-100">
            If someone already started it, you will see it below, tap to join
            them instead.
          </p>
        </div>
      </section>

      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-sans text-base font-medium tracking-wide text-ink-300 uppercase">
          Live near you
        </h2>
        <div className="flex items-center gap-5">
          <button
            type="button"
            aria-label="Search rooms"
            className="grid size-10 place-items-center rounded-full bg-white text-ink-400 transition-colors hover:bg-ivory-200"
          >
            <SearchIcon />
          </button>
          <Button size="sm" onClick={onHost}>
            Host an Event
          </Button>
        </div>
      </header>

      <ul className="flex flex-col gap-4">
        {LIVE_ROOMS.map((room) => (
          <li key={room.id}>
            <button
              type="button"
              onClick={() => setJoined(room)}
              className="flex w-full gap-2 rounded-lg bg-white p-4 text-left transition-colors hover:bg-ivory-50"
            >
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-50 text-primary-600">
              <LaptopIcon />
            </span>

            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <h3 className="font-sans text-sm font-semibold text-ink-600">
                {room.title}
              </h3>
              <div className="flex items-center gap-2">
                <MapPinIcon className="size-4 text-primary-600" />
                <span className="size-2 rounded-full bg-primary-500" />
                <span className="font-sans text-xs font-medium text-ink-400">
                  {room.place}
                </span>
              </div>
            </div>

            <div className="flex shrink-0 flex-col items-center gap-2">
              <span className="flex items-center gap-2">
                <span className="size-3 rounded-full bg-success-60" />
                <span className="font-sans text-sm font-medium text-success-60">
                  live
                </span>
              </span>
              <span className="font-sans text-sm font-medium text-ink-200">
                {room.here} here
              </span>
            </div>
            </button>
          </li>
        ))}
      </ul>

      {joined && (
        <LiveRoomModal
          title={joined.title}
          here={joined.here}
          onClose={() => setJoined(null)}
        />
      )}
    </div>
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

function LaptopIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="size-5" aria-hidden="true">
      <rect x="4" y="5" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2.5 15.5h15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function MapPinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path
        d="M8 1.5a4.5 4.5 0 0 1 4.5 4.5c0 3.2-4.5 8.5-4.5 8.5S3.5 9.2 3.5 6A4.5 4.5 0 0 1 8 1.5Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}
