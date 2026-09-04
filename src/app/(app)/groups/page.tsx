"use client";

import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

/**
 * Chapter Groups — Figma frame 177:3542 (the "My Group" section).
 *
 * Title bar with an Admin Mode toggle, a search pill beside "Create group",
 * then group cards. Card copy is Figma's (component 178:5933), including its
 * lorem-ipsum description placeholder.
 */
const AVATARS = [
  "/images/people/m1.png",
  "/images/people/m2.png",
  "/images/people/m3.png",
  "/images/people/m5.png",
];

const GROUPS = Array.from({ length: 4 }, (_, i) => ({
  id: i,
  title: "First-time Founder",
  badge: "First 1000 days",
  blurb: "Starting fresh somewhere new",
  description:
    "“Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut”",
}));

export default function GroupsPage() {
  const [adminMode, setAdminMode] = useState(false);
  const [query, setQuery] = useState("");

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-4 bg-white px-8 py-6">
        <h1 className="font-display text-2xl font-semibold text-ink-600">
          Chapter Groups
        </h1>
        <label className="flex items-center gap-2">
          <button
            type="button"
            role="switch"
            aria-checked={adminMode}
            onClick={() => setAdminMode((v) => !v)}
            className={`flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors ${
              adminMode ? "justify-end bg-primary-600" : "justify-start bg-ink-50"
            }`}
          >
            <span className="size-5 rounded-full bg-white shadow-sm" />
          </button>
          <span className="font-sans text-base text-ink-600">Admin Mode</span>
        </label>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-[724px] flex-col gap-4 pb-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
            <label className="relative flex-1">
              <span className="sr-only">Search groups</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search chapter groups"
                className="w-full rounded-full border border-ink-100 bg-ivory-50 px-6 py-4 font-sans text-base text-ink-500 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] outline-none placeholder:text-ink-200 focus:border-primary-200 focus:shadow-[0px_0px_0px_4px_rgba(249,189,152,0.25)]"
              />
            </label>
            <Button size="lg">Create group</Button>
          </div>

          <ul className="flex flex-col gap-4">
            {GROUPS.map((group) => (
              <li
                key={group.id}
                className="flex gap-2 rounded-lg bg-white p-4"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-50 text-primary-600">
                  <CursorIcon />
                </span>

                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <h2 className="font-sans text-sm font-semibold text-ink-600">
                    {group.title}
                  </h2>

                  <span className="w-fit rounded-full bg-ivory-500 p-2 font-sans text-xs font-semibold text-ink-300">
                    {group.badge}
                  </span>

                  <div className="flex items-center gap-3">
                    <span className="flex">
                      {AVATARS.map((src, i) => (
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
                        className="grid size-8 place-items-center rounded-full border-2 border-white bg-primary-50 font-sans text-sm font-extrabold text-primary-600"
                        style={{ marginLeft: -8 }}
                      >
                        SL
                      </span>
                    </span>
                    <span className="font-sans text-xs text-ink-400">
                      {group.blurb}
                    </span>
                  </div>

                  <p className="font-sans text-xs text-ink-400">
                    {group.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function CursorIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="size-4" aria-hidden="true">
      <path
        d="M3 2.5 12.5 7l-4 1.5L7 12.5 3 2.5Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}
