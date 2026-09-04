"use client";

import { useState } from "react";
import { NotificationsPanel } from "@/components/app/NotificationsPanel";
import { cn } from "@/lib/cn";

/**
 * Feed top bar — Figma frame 69:4637.
 *
 * Chapter tabs with a 2px bottom border (primary-600 when active), a search
 * field and a bell carrying an unread count.
 */
const TABS = ["All", "Career", "Health", "Spiritual", "Adventure"];

export function TopBar({
  unread = 2,
  title,
}: {
  unread?: number;
  /**
   * Sections like Nearby (357:7653) and Bonds (452:10234) put a page title
   * where the feed puts chapter tabs; passing one swaps the left side.
   */
  title?: string;
}) {
  const [active, setActive] = useState("All");
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  return (
    <header className="flex shrink-0 flex-wrap items-end justify-between gap-4 bg-white px-6 pt-8 lg:pr-12 lg:pt-13">
      {title ? (
        <h1 className="pb-2 font-display text-2xl font-semibold text-ink-600">
          {title}
        </h1>
      ) : (
        /* The five chapter tabs don't fit a 390px phone, so the row scrolls
           horizontally rather than clipping "Adventure". */
        <nav aria-label="Filter feed by chapter" className="-mx-6 min-w-0 max-w-full overflow-x-auto px-6 lg:mx-0 lg:px-0">
          <ul className="flex w-max">
            {TABS.map((tab) => {
              const isActive = tab === active;
              return (
                <li key={tab}>
                  <button
                    type="button"
                    onClick={() => setActive(tab)}
                    aria-current={isActive ? "true" : undefined}
                    className={cn(
                      "h-10 border-b-2 px-4 py-2 font-sans text-sm font-medium transition-colors",
                      isActive
                        ? "border-primary-600 text-ink-500"
                        : "border-ivory-600 text-ink-400 hover:text-ink-500",
                    )}
                  >
                    {tab}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      )}

      <div className="flex items-center gap-6 pb-2">
        <label className="relative block w-full max-w-[260px]">
          <span className="sr-only">Search</span>
          <input
            type="search"
            placeholder="Search"
            className="w-full rounded-lg bg-ivory-100 py-2.5 pr-10 pl-3.5 font-sans text-sm text-ink-500 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] outline-none placeholder:text-ink-200 focus:shadow-[0px_0px_0px_4px_rgba(249,189,152,0.25)]"
          />
          <SearchIcon className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-ink-300" />
        </label>

        <button
          type="button"
          aria-label={`Notifications, ${unread} unread`}
          onClick={() => setNotificationsOpen(true)}
          className="relative rounded-full p-1 text-[#1D2939] transition-colors hover:bg-ivory-200"
        >
          <BellIcon className="size-8" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full bg-[#F04438] font-sans text-xs text-white">
              {unread}
            </span>
          )}
        </button>
      </div>

      {notificationsOpen && (
        <NotificationsPanel onClose={() => setNotificationsOpen(false)} />
      )}
    </header>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="m11 11 3 3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 3a6 6 0 0 0-6 6c0 3.5-.8 5.4-1.5 6.4A.6.6 0 0 0 5 16.4h14a.6.6 0 0 0 .5-1c-.7-1-1.5-2.9-1.5-6.4a6 6 0 0 0-6-6Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 19a2.5 2.5 0 0 0 5 0"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
