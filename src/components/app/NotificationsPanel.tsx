"use client";

import { Button } from "@/components/ui/Button";

/**
 * Notifications — Figma frame 135:28124. A full-height 40/32 padded panel:
 * heading, a list of ivory-200 rows, and "Clear Notifications" pinned bottom.
 */
const ITEMS = Array.from({ length: 5 }, (_, i) => ({
  id: i,
  title: "We found someone you might connect with",
  body: "You and Maya share 3 spaces.",
  time: "2 min ago",
}));

export function NotificationsPanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-30 flex justify-end bg-black/20">
      {/* Clicking the backdrop closes the panel. */}
      <button
        type="button"
        aria-label="Close notifications"
        onClick={onClose}
        className="flex-1 cursor-default"
      />

      <aside className="flex h-full w-full max-w-[584px] flex-col justify-between overflow-y-auto bg-white px-8 py-10">
        <div className="flex flex-col gap-6">
          <header className="flex items-center justify-between">
            <h2 className="font-display text-3xl font-semibold text-ink-800">
              Notifications
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded p-3 text-ink-800 transition-colors hover:bg-ivory-200"
            >
              <CloseIcon className="size-5" />
            </button>
          </header>

          <ul className="flex flex-col gap-4">
            {ITEMS.map((item) => (
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
        </div>

        <div className="pt-8">
          <Button size="sm" fullWidth>
            Clear Notifications
          </Button>
        </div>
      </aside>
    </div>
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
