"use client";

import { useState } from "react";
import { BondChat, GlowAvatar, ChapterBadge } from "@/components/app/BondChat";
import { cn } from "@/lib/cn";

/**
 * Bonds — Figma frame 452:10158.
 *
 * Three columns: a 296px conversation list (Your Bond / Your Circle), the
 * 525px chat pane, and a 300px details rail. Names, times and the 70% bond
 * depth are Figma's (frame 452:10242).
 */
const BONDS = [
  { name: "Jalen Crestwood", avatar: "/images/people/jalen.png", depth: 70, online: true, status: "Mid-project" },
  { name: "Avery Thompson", avatar: "/images/bonds/avery.png", depth: 70, online: true, status: "Mid-project" },
  { name: "Morgan Lee", avatar: "/images/bonds/morgan.png", depth: 70, online: true, status: "Mid-project" },
];

const CIRCLE = [
  { name: "Jalen Crestwood", avatar: "/images/people/jalen.png", time: "12:25", unread: 23, online: true },
  { name: "Jalen Crestwood", avatar: "/images/people/jalen.png", time: "12:25", online: true },
  { name: "Jalen Crestwood", avatar: "/images/people/jalen.png", time: "12:25", online: false },
  { name: "Jalen Crestwood", avatar: "/images/people/jalen.png", time: "12:25", online: false },
];

export default function BondsPage() {
  const [active, setActive] = useState(0);
  const current = BONDS[active];

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Figma 452:10233 — this section titles the bar rather than showing tabs. */}
      <header className="flex shrink-0 items-center justify-between bg-white px-8 py-6">
        <h1 className="font-display text-2xl font-semibold text-ink-600">Bonds</h1>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <nav className="hidden w-[296px] shrink-0 flex-col overflow-y-auto border-r border-ink-50 bg-ivory-300 md:flex">
          <section className="flex flex-col gap-4 bg-white pt-4">
            <h2 className="px-4 font-sans text-base font-medium text-ink-600">
              YOUR BOND
            </h2>
            <ul>
              {BONDS.map((bond, i) => (
                <li key={bond.name}>
                  <button
                    type="button"
                    onClick={() => setActive(i)}
                    aria-current={i === active ? "true" : undefined}
                    className={cn(
                      "flex w-full flex-col gap-3 border-b border-ink-50 p-4 text-left transition-colors",
                      i === active ? "bg-primary-50" : "bg-white hover:bg-ivory-100",
                    )}
                  >
                    <span className="flex items-center gap-4 py-2 pl-2">
                      <GlowAvatar src={bond.avatar} online={bond.online} />
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate font-sans text-base font-medium text-ink-700">
                          {bond.name}
                        </span>
                        <ChapterBadge label={bond.status} />
                      </span>
                    </span>
                    <span className="flex items-center gap-4">
                      <span className="font-sans text-sm font-medium text-ink-300">
                        Bond Depth
                      </span>
                      <span className="h-1 flex-1 overflow-hidden rounded-full bg-ink-50">
                        <span
                          className="block h-full rounded-full bg-primary-600"
                          style={{ width: `${bond.depth}%` }}
                        />
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="flex flex-col bg-white pt-5">
            <h2 className="p-4 font-sans text-base font-medium text-ink-600">
              YOUR CIRCLE
            </h2>
            <ul>
              {CIRCLE.map((person, i) => (
                <li key={i}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 border-b border-ink-50 bg-white p-4 text-left transition-colors hover:bg-ivory-100"
                  >
                    <span className="flex flex-1 items-center gap-4 p-2">
                      <GlowAvatar src={person.avatar} online={person.online} />
                      <span className="min-w-0 truncate font-sans text-base font-medium text-ink-700">
                        {person.name}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <span className="font-sans text-sm font-medium text-ink-200">
                        {person.time}
                      </span>
                      {person.unread && (
                        <span className="rounded-full bg-primary-600 px-1.5 py-0.5 font-sans text-xs text-white">
                          {person.unread}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </nav>

        <BondChat
          name={current.name}
          avatar={current.avatar}
          depth={current.depth}
          duration="7 months"
          status={current.status}
        />
      </div>
    </div>
  );
}
