"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * Search — Figma frames 123:10150 (desktop) and 628:35194 (phone).
 *
 * A pill input (812x72, 123px radius, ivory-50 on a text-100 border) above the
 * heading and two rows of suggestion chips (frame 123:10158). The phone frame
 * adds a back/title bar, shrinks the pill and puts a filter glyph inside it.
 */
/** Frame 628:35649 — one wrapping flow, not fixed rows. */
const SUGGESTIONS = [
  "New to freelance",
  "New to freelance",
  "Relocating solo",
  "Going pro",
  "Career pivot",
  "Deep in recovery",
];

export default function SearchPage() {
  const [query, setQuery] = useState("");

  // Carries over whatever was typed in the top bar. Read from the URL after
  // mount rather than useSearchParams, so the route stays statically rendered.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) setQuery(q);
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-ivory-100">
      {/* Frame 628:35194 — the phone gets a back/title bar. */}
      <header className="flex shrink-0 items-center gap-4 bg-white px-5 py-4 lg:hidden">
        <Link href="/home" aria-label="Back" className="text-ink-800">
          <BackIcon />
        </Link>
        <h1 className="font-display text-xl font-semibold text-ink-600">
          Search
        </h1>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 lg:px-6 lg:py-10">
      <div className="mx-auto flex w-full max-w-[812px] flex-col gap-10 lg:gap-14">
        <label className="relative block">
          <span className="sr-only">Search Grouv</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people, posts, groups, spaces"
            className="h-12 w-full rounded-full border border-ink-100 bg-ivory-50 pr-12 pl-12 font-sans text-sm text-ink-500 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] outline-none placeholder:text-ink-200 focus:border-primary-200 focus:shadow-[0px_0px_0px_4px_rgba(249,189,152,0.25)] lg:h-[72px] lg:pr-6 lg:pl-16 lg:text-lg"
          />
          <SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-ink-300 lg:left-6 lg:size-6" />
          <FilterIcon className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-ink-300 lg:hidden" />
        </label>

        <div className="flex flex-col gap-8">
          <h1 className="text-center font-display text-xl leading-[1.2] font-semibold text-ink-500 lg:text-left lg:text-4xl lg:leading-[1.04] xl:text-5xl">
            What are you looking for?
          </h1>

          <div className="flex flex-wrap justify-center gap-3 lg:justify-start lg:gap-4">
            {SUGGESTIONS.map((chip, i) => (
              <button
                key={`${chip}-${i}`}
                type="button"
                onClick={() => setQuery(chip)}
                className={cn(
                  "rounded-full px-4 py-2 font-sans text-sm font-medium transition-colors",
                  query === chip
                    ? "bg-primary-500 text-white"
                    : "bg-primary-50 text-primary-600 hover:bg-primary-100",
                )}
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-6" aria-hidden="true">
      <path
        d="M19 12H5m0 0 6-6m-6 6 6 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** The funnel inside the phone search pill. */
function FilterIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path
        d="M2 3.5h12l-4.5 5v4l-3 1.5v-5.5L2 3.5Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="m16.5 16.5 4 4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
