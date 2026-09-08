"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

/**
 * Notifications — Figma frames 135:28124 (desktop) and 628:35736 (phone).
 *
 * A full-height 40/32 padded panel: heading, a list of ivory-200 rows, and
 * "Clear Notifications" pinned bottom. The phone frame leads with a back arrow
 * instead of a trailing close button.
 */
const ITEMS = Array.from({ length: 5 }, (_, i) => ({
  id: i,
  title: "We found someone you might connect with",
  body: "You and Maya share 3 spaces.",
  time: "2 min ago",
}));

export function NotificationsPanel({ onClose }: { onClose: () => void }) {
  // Clearing reaches Figma's empty frame (628:35887).
  const [items, setItems] = useState(ITEMS);

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/20">
      {/* Clicking the backdrop closes the panel. */}
      <button
        type="button"
        aria-label="Close notifications"
        onClick={onClose}
        className="flex-1 cursor-default"
      />

      <aside className="flex h-full w-full max-w-[584px] flex-col justify-between overflow-y-auto bg-white px-5 py-6 lg:px-8 lg:py-10">
        <div className="flex flex-col gap-6">
          <header className="flex items-center gap-4 lg:justify-between">
            <button
              type="button"
              onClick={onClose}
              aria-label="Back"
              className="text-ink-800 lg:hidden"
            >
              <BackIcon />
            </button>
            <h2 className="flex-1 font-display text-xl font-semibold text-ink-800 lg:flex-none lg:text-3xl">
              Notifications
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="hidden rounded p-3 text-ink-800 transition-colors hover:bg-ivory-200 lg:block"
            >
              <CloseIcon className="size-5" />
            </button>
          </header>

          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-lg bg-white px-6 py-14 text-center">
              <BellArt />
              <p className="font-display text-2xl font-semibold text-ink-800">
                No Notifications
              </p>
              <p className="font-sans text-base text-ink-300">
                Notification Inbox Empty
              </p>
            </div>
          ) : (
          <ul className="flex flex-col gap-4">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex gap-4 rounded-lg bg-ivory-200 p-4"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-50 text-primary-600">
                  <UsersIcon className="size-6" />
                </span>
                <div className="flex min-w-0 flex-col">
                  <p className="font-sans text-sm font-semibold text-ink-800">
                    {item.title}
                  </p>
                  <p className="font-sans text-sm text-ink-300">{item.body}</p>
                  <p className="font-sans text-xs text-ink-200">{item.time}</p>
                </div>
              </li>
            ))}
          </ul>
          )}
        </div>

        <div className="pt-8">
          <Button size="sm" fullWidth onClick={() => setItems([])}>
            Clear Notifications
          </Button>
        </div>
      </aside>
    </div>
  );
}

/** The frowning bell from Figma's empty frame (628:35887). */
function BellArt() {
  return (
    <svg
      viewBox="0 0 220 190"
      className="h-[170px] w-[200px]"
      fill="none"
      aria-hidden="true"
    >
      <ellipse cx="78" cy="86" rx="46" ry="38" fill="#FDE7D8" />
      <ellipse cx="150" cy="96" rx="42" ry="34" fill="#FDE7D8" />
      <circle cx="112" cy="126" r="20" fill="#F9BE95" />
      <path
        d="M110 40c-22 0-38 17-38 39 0 26-6 40-11 47a4 4 0 0 0 3 7h92a4 4 0 0 0 3-7c-5-7-11-21-11-47 0-22-16-39-38-39Z"
        fill="#FFFFFF"
        stroke="#C9CDD4"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <circle cx="110" cy="36" r="6" fill="#FFFFFF" stroke="#C9CDD4" strokeWidth="2.5" />
      <circle cx="96" cy="92" r="3" fill="#C9CDD4" />
      <circle cx="128" cy="92" r="3" fill="#C9CDD4" />
      <path
        d="M98 116a16 16 0 0 1 28 0"
        stroke="#C9CDD4"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M148 54a18 14 0 1 1 0 28h-4l-8 8v-9a14 14 0 0 1-6-13 18 14 0 0 1 18-14Z"
        fill="#FFFFFF"
        stroke="#C9CDD4"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <circle cx="141" cy="68" r="2.4" fill="#C9CDD4" />
      <circle cx="150" cy="68" r="2.4" fill="#C9CDD4" />
      <circle cx="159" cy="68" r="2.4" fill="#C9CDD4" />
      <path
        d="M62 52h9M66.5 47.5v9M170 62h8M174 58v8M158 132h8M162 128v8"
        stroke="#F3A06A"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="88" cy="60" r="2.5" fill="#D9DDE3" />
      <circle cx="140" cy="46" r="2.5" fill="#D9DDE3" />
      <ellipse cx="112" cy="156" rx="56" ry="4" fill="#F6D9C6" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="9" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M3.5 19a5.5 5.5 0 0 1 11 0"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M16 5.2a3.2 3.2 0 0 1 0 5.6M17 14.2a5.5 5.5 0 0 1 3.5 4.8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
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

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="m6 6 12 12M18 6 6 18"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
