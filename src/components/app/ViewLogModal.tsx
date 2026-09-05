"use client";

import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

/**
 * View log — Figma frame 246:7102.
 *
 * A 660px card: the member's glowing portrait beside "<Name>'s Log" and its
 * chapter badge, then one entry at a time on an ivory tray with a scrubber at
 * each end, and "Let's Grouv" below a rule.
 */
export function ViewLogModal({
  name,
  avatar,
  entries,
  onClose,
}: {
  name: string;
  avatar: string;
  entries: string[];
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);
  const step = (dir: number) =>
    setIndex((i) => (i + dir + entries.length) % entries.length);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-900/40 p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${name}’s Log`}
        onClick={(e) => e.stopPropagation()}
        className="my-auto flex w-full max-w-[660px] flex-col gap-6 rounded-2xl bg-white p-6 sm:p-8"
      >
        <header className="flex items-center justify-between gap-4 border-b border-ink-50 pb-4">
          <div className="flex items-center gap-6 p-2">
            <span className="relative size-12 shrink-0">
              <span
                className="absolute inset-0 rounded-full bg-[#F0B231]"
                style={{ boxShadow: "0px 2px 9px 9px rgba(251, 148, 31, 0.45)" }}
              />
              <Image
                src={avatar}
                alt=""
                fill
                sizes="48px"
                className="rounded-full object-cover"
              />
              <span className="absolute right-0 bottom-0 size-3 rounded-full border-[1.5px] border-white bg-success-60" />
            </span>

            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="font-sans text-base font-medium text-ink-700">
                {name}&rsquo;s Log
              </span>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-2 rounded-full bg-ivory-200 px-3 py-1">
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
                <span className="size-1 rounded-full bg-ink-100" />
                <span className="font-sans text-xs text-ink-400">2h ago</span>
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

        {/* Frame 249:12878 — one entry centred on an ivory tray. */}
        <div className="relative flex items-center justify-center rounded-lg bg-ivory-100 px-4 py-12">
          <Scrubber side="left" onClick={() => step(-1)} />

          <figure className="flex w-full max-w-[368px] flex-col gap-3 rounded-lg bg-white p-2 pb-4 shadow-[0px_4px_16px_0px_rgba(0,0,0,0.1)]">
            <div className="relative h-[252px] w-full overflow-hidden rounded-lg">
              <Image
                src={entries[index]}
                alt=""
                fill
                sizes="368px"
                className="object-cover"
              />
            </div>
            <figcaption className="flex flex-col px-2">
              <span className="flex items-center gap-2 font-sans text-xs font-medium text-ink-200">
                DAY 12
                <span className="size-1 rounded-full bg-ink-300" />
                APR. 10
              </span>
              <span className="font-sans text-lg font-semibold text-ink-700">
                Shipped the ugly version. It&rsquo;s out
              </span>
            </figcaption>
          </figure>

          <Scrubber side="right" onClick={() => step(1)} />
        </div>

        <div className="pt-6">
          <Button size="sm" fullWidth href="/bonds">
            Let&rsquo;s Grouv
          </Button>
        </div>
      </div>
    </div>
  );
}

/** The 40px glassy scrubbers at each end (249:12899 / 252:12904). */
function Scrubber({
  side,
  onClick,
}: {
  side: "left" | "right";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === "left" ? "Previous entry" : "Next entry"}
      className="absolute top-1/2 z-10 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-white/40 text-white backdrop-blur-[20px]"
      style={{
        [side]: "24px",
        backgroundImage:
          "linear-gradient(135deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.2) 100%)",
      }}
    >
      <svg viewBox="0 0 24 24" fill="none" className="size-5" aria-hidden="true">
        <path
          d={side === "left" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
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
