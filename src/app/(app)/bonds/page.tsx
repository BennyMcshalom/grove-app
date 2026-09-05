"use client";

import { useState } from "react";
import { BondChat, GlowAvatar, ChapterBadge } from "@/components/app/BondChat";
import Image from "next/image";
import { cn } from "@/lib/cn";

/**
 * Bonds — Figma frames 452:10158 (desktop) and 635:18535 / 635:19212 (phone).
 *
 * Three columns on desktop: a 296px conversation list (Your Bond / Your
 * Circle), the 525px chat pane, and a 300px details rail. The phone shows the
 * list first — with PENDING CONNECTION and PEOPLE YOU MIGHT KNOW above it —
 * and opens the chat full screen. Names, times and the 70% bond depth are
 * Figma's (frame 452:10242).
 */
const PENDING = Array.from({ length: 6 }, () => ({
  name: "Jalen Crestwood",
  avatar: "/images/people/jalen.png",
}));

const MAYBE_KNOW = [
  "/images/people/m1.png",
  "/images/people/m2.png",
  "/images/people/m3.png",
  "/images/people/m5.png",
];
const BONDS = [
  { name: "Jalen Crestwood", avatar: "/images/people/jalen.png", depth: 70, online: true, status: "Mid-project" },
  { name: "Avery Thompson", avatar: "/images/people/m5.png", depth: 70, online: true, status: "Post-project" },
  { name: "Morgan Lee", avatar: "/images/people/nina.png", depth: 70, online: true, status: "Pre-project" },
];

const CIRCLE: { name: string; avatar: string; time: string; unread?: number; online: boolean; status: string }[] = [
  { name: "Jalen Crestwood", avatar: "/images/people/jalen.png", time: "12:25", unread: 23, online: true, status: "Mid-project" },
  { name: "Jalen Crestwood", avatar: "/images/people/jalen.png", time: "12:25", online: true, status: "Mid-project" },
  { name: "Jalen Crestwood", avatar: "/images/people/jalen.png", time: "12:25", online: false, status: "Mid-project" },
  { name: "Jalen Crestwood", avatar: "/images/people/jalen.png", time: "12:25", online: false, status: "Mid-project" },
];

/** What the chat pane needs, whether the row came from Bonds or Circle. */
type Conversation = {
  name: string;
  avatar: string;
  status: string;
  depth: number;
};

export default function BondsPage() {
  const [active, setActive] = useState(0);
  // Circle rows open a conversation too, so selection is the conversation
  // itself rather than an index into BONDS.
  const [selected, setSelected] = useState<Conversation | null>(null);
  // On a phone the list and the chat are separate screens (635:18535 vs
  // 635:19212); on desktop both panes are on screen at once.
  const [chatOpen, setChatOpen] = useState(false);
  const current: Conversation = selected ?? BONDS[active];

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Figma 452:10233 — this section titles the bar rather than showing tabs. */}
      <header
        className={cn(
          "shrink-0 items-center justify-between bg-white px-5 py-6 md:flex md:px-8",
          chatOpen ? "hidden" : "flex",
        )}
      >
        <h1 className="font-display text-2xl font-semibold text-ink-600">Bonds</h1>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <nav
          className={cn(
            "w-full shrink-0 flex-col overflow-y-auto border-r border-ink-50 bg-ivory-300 md:flex md:w-[296px]",
            chatOpen ? "hidden" : "flex",
          )}
        >
          {/* Frame 635:18535 — the phone leads with these two sections. */}
          <section className="flex flex-col gap-4 bg-ivory-100 px-4 py-4 md:hidden">
            <h2 className="font-sans text-base font-medium text-ink-600">
              PENDING CONNECTION
            </h2>
            <ul className="-mx-4 flex gap-4 overflow-x-auto px-4">
              {PENDING.map((p_, i) => (
                <li
                  key={i}
                  className="flex w-20 shrink-0 flex-col items-center gap-2"
                >
                  <GlowAvatar src={p_.avatar} online={false} />
                  <span className="truncate text-center font-sans text-xs text-ink-500">
                    {p_.name}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="flex flex-col gap-4 bg-ivory-100 px-4 pb-4 md:hidden">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-sans text-base font-medium text-ink-600">
                PEOPLE YOU MIGHT KNOW
              </h2>
              <span className="shrink-0 font-sans text-sm font-medium text-primary-500">
                See all
              </span>
            </div>
            <div
              className="flex flex-col gap-2 rounded-lg p-4"
              style={{
                backgroundImage:
                  "linear-gradient(-7deg, rgba(254,230,215,1) 0%, rgba(254,251,249,1) 100%)",
              }}
            >
              <span className="font-sans text-sm font-semibold text-ink-700">
                Amara Chidi
              </span>
              <div className="flex items-center gap-3">
                <span className="flex shrink-0">
                  {MAYBE_KNOW.map((src, i) => (
                    <span
                      key={src}
                      className="relative size-8 overflow-hidden rounded-full border-2 border-white"
                      style={{ marginLeft: i === 0 ? 0 : -8 }}
                    >
                      <Image
                        src={src}
                        alt=""
                        fill
                        sizes="32px"
                        className="object-cover"
                      />
                    </span>
                  ))}
                  <span
                    className="grid size-8 shrink-0 place-items-center rounded-full border-2 border-white bg-primary-50 font-ui text-sm font-extrabold text-primary-600"
                    style={{ marginLeft: -8 }}
                  >
                    SL
                  </span>
                </span>
                <span className="font-sans text-xs text-ink-400">
                  4 people in your circle know Amara
                </span>
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-4 bg-white pt-4">
            <h2 className="px-4 font-sans text-base font-medium text-ink-600">
              YOUR BOND
            </h2>
            <ul>
              {BONDS.map((bond, i) => (
                <li key={bond.name}>
                  <button
                    type="button"
                    onClick={() => {
                      setActive(i);
                      setSelected(null);
                      setChatOpen(true);
                    }}
                    aria-current={!selected && i === active ? "true" : undefined}
                    className={cn(
                      "flex w-full flex-col gap-3 border-b border-ink-50 p-4 text-left transition-colors",
                      !selected && i === active
                        ? "bg-primary-50"
                        : "bg-white hover:bg-ivory-100",
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
                    onClick={() => {
                      setSelected({ ...person, depth: 40 });
                      setChatOpen(true);
                    }}
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

        <div
          className={cn(
            "min-h-0 min-w-0 flex-1 md:flex",
            chatOpen ? "flex" : "hidden",
          )}
        >
          <BondChat
            name={current.name}
            avatar={current.avatar}
            depth={current.depth}
            duration="7 months"
            status={current.status}
            onBack={() => setChatOpen(false)}
          />
        </div>
      </div>
    </div>
  );
}
