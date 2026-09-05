"use client";

import Link from "next/link";

/**
 * The phone "More" sheet — Figma frame 601:31816.
 *
 * The destinations the five-item tab bar cannot hold, each with its outline
 * glyph, then the trial card below a rule.
 */
const ITEMS = [
  { href: "/groups", label: "Groups", icon: "events" },
  { href: "/events", label: "Events", icon: "events" },
  { href: "/nearby", label: "Nearby", icon: "nearby" },
  { href: "/archive", label: "Archive", icon: "archive" },
  { href: "/deep-focus", label: "Deep Focus", icon: "deep-focus" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

export function MobileMenuSheet({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-ink-900/40 lg:hidden"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="More"
        onClick={(e) => e.stopPropagation()}
        className="flex w-full flex-col gap-6 rounded-t-2xl bg-white px-4 pt-8 pb-14"
      >
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded p-2 text-ink-800 transition-colors hover:bg-ivory-200"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="size-6"
              aria-hidden="true"
            >
              <path
                d="m5 5 14 14M19 5 5 19"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <ul className="flex flex-col">
          {ITEMS.map((item) => (
            <li key={item.label}>
              <Link
                href={item.href}
                onClick={onClose}
                className="flex items-center gap-3 rounded px-4 py-3 font-sans text-sm text-ink-600 transition-colors hover:bg-ivory-200"
              >
                <span
                  className="size-5 shrink-0 bg-current"
                  style={{
                    maskImage: `url(/icons/nav-outline/${item.icon}.svg)`,
                    WebkitMaskImage: `url(/icons/nav-outline/${item.icon}.svg)`,
                    maskSize: "contain",
                    WebkitMaskSize: "contain",
                    maskRepeat: "no-repeat",
                    WebkitMaskRepeat: "no-repeat",
                    maskPosition: "center",
                    WebkitMaskPosition: "center",
                  }}
                />
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="border-t border-ink-50 pt-6">
          <Link
            href="/settings"
            onClick={onClose}
            className="flex items-center gap-3 rounded-2xl bg-primary-500 px-4 py-3 text-white"
          >
            <SproutIcon />
            <span className="flex flex-col">
              <span className="font-sans text-sm font-semibold">
                Start 14-day trial
              </span>
              <span className="font-sans text-xs text-ink-50">
                Full access, free
              </span>
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}

function SproutIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="size-4" aria-hidden="true">
      <path
        d="M8 14V7m0 0C8 5 6.5 3.5 4 3.5c0 2.5 1.5 3.5 4 3.5Zm0 0c0-2 1.5-3.5 4-3.5 0 2.5-1.5 3.5-4 3.5Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
