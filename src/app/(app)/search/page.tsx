"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

/**
 * Search — Figma frame 123:10150.
 *
 * A pill input (812x72, 123px radius, ivory-50 on a text-100 border) above the
 * heading and two rows of suggestion chips (frame 123:10158).
 */
const SUGGESTIONS = [
  ["New to freelance", "Going pro", "Relocating solo"],
  ["Career pivot", "Deep in recovery", "First tech job"],
];

export default function SearchPage() {
  const [query, setQuery] = useState("");

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-ivory-100 px-6 py-10">
      <div className="mx-auto flex w-full max-w-[812px] flex-col gap-14">
        <label className="relative block">
          <span className="sr-only">Search Grouv</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people, spaces and chapters"
            className="h-[72px] w-full rounded-full border border-ink-100 bg-ivory-50 pr-6 pl-16 font-sans text-lg text-ink-500 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] outline-none placeholder:text-ink-200 focus:border-primary-200 focus:shadow-[0px_0px_0px_4px_rgba(249,189,152,0.25)]"
          />
          <SearchIcon className="pointer-events-none absolute top-1/2 left-6 size-6 -translate-y-1/2 text-ink-300" />
        </label>

        <div className="flex flex-col gap-8">
          <h1 className="font-display text-3xl leading-[1.04] font-semibold text-ink-500 lg:text-4xl xl:text-5xl">
            What are you looking for?
          </h1>

          <div className="flex flex-col items-center gap-4">
            {SUGGESTIONS.map((row, i) => (
              <div key={i} className="flex flex-wrap justify-center gap-4">
                {row.map((chip) => (
                  <button
                    key={chip}
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
            ))}
          </div>
        </div>
      </div>
    </div>
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
