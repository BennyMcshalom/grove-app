"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/cn";

/**
 * live — Figma frame 458:13190 (a Meet & Greet room you have joined).
 *
 * The room name with its live count, the "You're here and visible" banner with
 * Leave, then HERE RIGHT NOW: everyone in the room, you marked "You" and the
 * rest wavable.
 */
const PEOPLE = [
  {
    name: "Jalen Crestwood",
    avatar: "/images/people/jalen.png",
    glow: "rgba(251, 148, 31, 0.45)",
    ring: "#F0B231",
    self: true,
    waved: false,
  },
  {
    name: "Mira Langston",
    avatar: "/images/people/m2.png",
    glow: "rgba(108, 2, 238, 0.3)",
    ring: "#B27CFD",
    self: false,
    waved: true,
  },
  {
    name: "Evan Thorne",
    avatar: "/images/people/m4.png",
    glow: "rgba(251, 148, 31, 0.45)",
    ring: "#F0B231",
    self: false,
    waved: false,
  },
  {
    name: "Lena Voss",
    avatar: "/images/people/lena.png",
    glow: "rgba(251, 148, 31, 0.45)",
    ring: "#F0B231",
    self: false,
    waved: false,
  },
];

export function LiveRoomModal({
  title,
  here,
  onClose,
}: {
  title: string;
  here: number;
  onClose: () => void;
}) {
  const [waved, setWaved] = useState<Record<string, boolean>>(
    Object.fromEntries(PEOPLE.map((p) => [p.name, p.waved])),
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-900/40 p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="my-auto flex w-full max-w-[660px] flex-col gap-6 rounded-2xl bg-white p-6 sm:p-8"
      >
        <header className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="grid size-14 shrink-0 place-items-center rounded-full bg-primary-50 text-primary-600">
              <LaptopIcon />
            </span>
            <div className="flex flex-col gap-2">
              <h2 className="font-display text-2xl font-semibold text-ink-800">
                {title}
              </h2>
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-2">
                  <span className="size-3 rounded-full bg-success-60" />
                  <span className="font-sans text-sm font-medium text-success-60">
                    live
                  </span>
                </span>
                <span className="size-2 rounded-full bg-primary-500" />
                <span className="font-ui text-sm font-medium text-ink-200">
                  {here} Meeting &amp; Greeting
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded p-3 text-ink-800 transition-colors hover:bg-ivory-200"
          >
            <CloseIcon />
          </button>
        </header>

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg bg-primary-50 p-5">
          <p className="font-sans text-lg text-black">
            You&rsquo;re here and visible in this room
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-[72px] shrink-0 rounded-full bg-ivory-100 px-3 py-2.5 font-ui text-sm font-medium text-primary-600 transition-colors hover:bg-ivory-200"
          >
            Leave
          </button>
        </div>

        <h3 className="font-sans text-base font-medium text-ink-300">
          HERE RIGHT NOW
        </h3>

        <ul className="flex flex-col gap-4">
          {PEOPLE.map((person) => (
            <li
              key={person.name}
              className="flex flex-wrap items-center justify-between gap-4 p-2"
            >
              <div className="flex items-center gap-6">
                <span className="relative size-12 shrink-0">
                  <span
                    className="absolute inset-0 rounded-full"
                    style={{
                      backgroundColor: person.ring,
                      boxShadow: `0px 2px 9px 9px ${person.glow}`,
                    }}
                  />
                  <Image
                    src={person.avatar}
                    alt=""
                    fill
                    sizes="48px"
                    className="rounded-full object-cover"
                  />
                  <span className="absolute right-0 bottom-0 size-3 rounded-full border-[1.5px] border-white bg-success-60" />
                </span>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="font-sans text-base font-medium text-ink-700">
                    {person.name}
                  </span>
                  <span className="flex w-fit items-center gap-2 rounded-full bg-ivory-200 px-3 py-1">
                    <span
                      className="size-5 bg-primary-600"
                      style={{
                        maskImage: "url(/icons/events/palette.svg)",
                        WebkitMaskImage: "url(/icons/events/palette.svg)",
                        maskSize: "contain",
                        WebkitMaskSize: "contain",
                        maskRepeat: "no-repeat",
                        WebkitMaskRepeat: "no-repeat",
                        maskPosition: "center",
                        WebkitMaskPosition: "center",
                      }}
                    />
                  </span>
                </div>
              </div>

              {person.self ? (
                <span className="shrink-0 rounded-full bg-ink-50 px-3 py-2.5 font-ui text-sm font-medium text-ink-500">
                  You
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    setWaved((prev) => ({
                      ...prev,
                      [person.name]: !prev[person.name],
                    }))
                  }
                  aria-pressed={waved[person.name]}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-full px-3 py-2.5 font-ui text-sm font-medium transition-colors",
                    waved[person.name]
                      ? "bg-primary-500 text-ink-50 hover:bg-primary-400"
                      : "bg-primary-50 text-primary-600 hover:bg-primary-100",
                  )}
                >
                  <HandIcon />
                  {waved[person.name] ? "Waved" : "Wave"}
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function LaptopIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" className="size-8" aria-hidden="true">
      <rect
        x="6"
        y="8"
        width="20"
        height="13"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M3 24.5h26"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function HandIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="size-4" aria-hidden="true">
      <path
        d="M5 8.5V4a1 1 0 0 1 2 0v3.5M7 7.5V3a1 1 0 0 1 2 0v4.5M9 7.5V4.5a1 1 0 0 1 2 0V9c0 2.5-1.5 4.5-4 4.5S3.5 11.5 3.5 9V7a1 1 0 0 1 2 0"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="size-5" aria-hidden="true">
      <path
        d="m3.5 3.5 9 9m0-9-9 9"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
