"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { NotificationsPanel } from "@/components/app/NotificationsPanel";
import { Logo } from "@/components/ui/Logo";
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
  icon,
}: {
  unread?: number;
  /**
   * Sections like Nearby (357:7653) and Bonds (452:10234) put a page title
   * where the feed puts chapter tabs; passing one swaps the left side.
   */
  title?: string;
  /** Event View (452:9877) prefixes its title with a primary-50 glyph. */
  icon?: React.ReactNode;
}) {
  const [active, setActive] = useState("All");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();

  const tabs = (
    /* The five chapter tabs don't fit a 390px phone, so the row scrolls
       horizontally rather than clipping "Adventure". */
    <nav
      aria-label="Filter feed by chapter"
      className="-mx-5 min-w-0 max-w-full overflow-x-auto px-5 lg:mx-0 lg:px-0"
    >
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
  );

  return (
    <>
    {/* Frame 621:32061 — the phone header carries the logo and three glyphs;
        the sidebar that holds them on desktop is hidden at this width. */}
    <header className="flex shrink-0 flex-col gap-3 bg-white px-5 pt-3 lg:hidden">
      <div className="flex items-center justify-between gap-4">
        <Link href="/home" aria-label="Grouv home">
          <Logo className="h-6" />
        </Link>
        <div className="flex h-11 items-center gap-5">
          <button
            type="button"
            aria-label={`Notifications, ${unread} unread`}
            onClick={() => setNotificationsOpen(true)}
            className="relative text-[#1D2939]"
          >
            <BellIcon className="size-8" />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-[#F04438] font-sans text-xs text-white">
                {unread}
              </span>
            )}
          </button>
          <Link href="/search" aria-label="Search" className="text-[#1D2939]">
            <SearchIcon className="size-7" />
          </Link>
          <Link
            href="/settings"
            aria-label="Appearance"
            className="text-[#1D2939]"
          >
            <MoonIcon className="size-7" />
          </Link>
        </div>
      </div>
      {title ? (
        <h1 className="pb-2 font-display text-2xl font-semibold text-ink-600">
          {title}
        </h1>
      ) : (
        tabs
      )}
    </header>

    <header className="hidden shrink-0 flex-wrap items-end justify-between gap-4 bg-white px-6 pt-8 lg:flex lg:pr-12 lg:pt-13">
      {title ? (
        <div className="flex items-center gap-4 pb-2">
          {icon}
          <h1 className="font-display text-2xl font-semibold text-ink-600">
            {title}
          </h1>
        </div>
      ) : (
        tabs
      )}

      <div className="flex items-center gap-6 pb-2">
        <form
          className="relative block w-full max-w-[260px]"
          onSubmit={(e) => {
            e.preventDefault();
            router.push(query ? `/search?q=${encodeURIComponent(query)}` : "/search");
          }}
        >
          <label className="sr-only" htmlFor="topbar-search">Search</label>
          <input
            id="topbar-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="w-full rounded-lg bg-ivory-100 py-2.5 pr-10 pl-3.5 font-sans text-sm text-ink-500 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] outline-none placeholder:text-ink-200 focus:shadow-[0px_0px_0px_4px_rgba(249,189,152,0.25)]"
          />
          <SearchIcon className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-ink-300" />
        </form>

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

    </header>

    {notificationsOpen && (
      <NotificationsPanel onClose={() => setNotificationsOpen(false)} />
    )}
    </>
  );
}

/** Icon/Moon (8:8644) — the phone header's appearance toggle. */
function MoonIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
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
