"use client";

import Image from "next/image";
import { useState } from "react";
import { ViewLogModal } from "@/components/app/ViewLogModal";
import { TopBar } from "@/components/app/TopBar";
import { RightRail } from "@/components/app/RightRail";
import { LogPrompt, LogMemories } from "@/components/app/LogPrompt";

/**
 * Grouv Log — Figma frame 246:6062.
 *
 * A 708px centred column: today's prompt card, your logged memories, then a
 * "Log from your circle" list where each row shows a member and three of
 * their recent entries (frame 249:12722).
 */
const CIRCLE_LOGS = [
  {
    name: "Jalen Crestwood",
    status: "Mid-project",
    avatar: "/images/people/jalen.png",
    entries: [
      "/images/log/memory-2.png",
      "/images/log/memory-3.png",
      "/images/log/memory-4.png",
    ],
  },
  {
    name: "Mira Langston",
    status: "Building a business",
    avatar: "/images/people/m2.png",
    entries: [
      "/images/log/memory-3.png",
      "/images/log/memory-4.png",
      "/images/log/memory-1.png",
    ],
  },
  {
    name: "Evan Thorne",
    status: "Mid-project",
    avatar: "/images/people/m4.png",
    entries: [
      "/images/log/memory-4.png",
      "/images/log/memory-1.png",
      "/images/log/memory-2.png",
    ],
  },
];

export default function LogPage() {
  // "View log" opens that member's log sheet (246:7102).
  const [viewing, setViewing] = useState<(typeof CIRCLE_LOGS)[number] | null>(
    null,
  );

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar />

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 lg:px-8">
          <div className="mx-auto flex w-full max-w-[708px] flex-col items-center gap-8 pb-10">
            <LogPrompt />
            <LogMemories count={4} />

            <section className="flex w-full flex-col gap-5">
              <header className="flex flex-col gap-1">
                <h2 className="font-display text-2xl font-semibold text-ink-800">
                  Log from your circle
                </h2>
                <p className="font-sans text-base text-ink-400">
                  Different lives, different phase
                </p>
              </header>

              <div className="flex flex-col gap-6">
                {CIRCLE_LOGS.map((member) => (
                  <article
                    key={member.name}
                    className="flex flex-col gap-2 rounded-3xl bg-white px-4 py-3"
                  >
                    <div className="flex items-center gap-6 p-2">
                      <span className="relative size-12 shrink-0 overflow-hidden rounded-full">
                        <Image
                          src={member.avatar}
                          alt=""
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      </span>
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate font-sans text-base font-semibold text-ink-700">
                          {member.name}
                        </span>
                        <span className="truncate font-sans text-sm text-ink-300">
                          {member.status}
                        </span>
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      {member.entries.map((src, i) => (
                        <div
                          key={`${member.name}-${i}`}
                          className="relative aspect-[3/4] overflow-hidden rounded-[20px] border border-ink-100"
                        >
                          <Image
                            src={src}
                            alt=""
                            fill
                            sizes="(min-width: 1024px) 200px, 33vw"
                            className="object-cover"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-center py-1">
                      <button
                        type="button"
                        onClick={() => setViewing(member)}
                        className="flex items-center gap-2 rounded-full px-3 py-2.5 font-ui text-sm text-primary-800 transition-colors hover:bg-primary-50"
                      >
                        View log
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          className="size-4"
                          aria-hidden="true"
                        >
                          <path
                            d="m9 5 7 7-7 7"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>

      <RightRail />

      {viewing && (
        <ViewLogModal
          name={viewing.name.split(" ")[0]}
          avatar={viewing.avatar}
          entries={viewing.entries}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  );
}
