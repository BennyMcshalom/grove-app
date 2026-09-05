"use client";

import Image from "next/image";
import { Button } from "@/components/ui/Button";

/**
 * Proximity card — Figma frame 481:15568.
 *
 * A 383px white card: the person's glowing portrait, their distance, their
 * chapter chips and note, and a full-width Connect button.
 */
export interface NearbyPerson {
  name: string;
  avatar: string;
  distance: string;
  chapter: string;
  status: string;
  message: string;
}

export function ProximityCard({
  person,
  onClose,
  onConnect,
}: {
  person: NearbyPerson;
  onClose: () => void;
  onConnect: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={person.name}
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-[383px] flex-col items-end gap-6 rounded-2xl bg-white p-4"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="text-ink-800 transition-colors hover:text-ink-600"
        >
          <CloseIcon />
        </button>

        <div className="flex w-full flex-col gap-4">
          <div className="flex flex-col justify-center gap-6 py-2 pl-2">
            <div className="flex items-center gap-6">
              <span className="relative size-12 shrink-0">
                <span
                  className="absolute inset-0 rounded-full bg-[#F0B231]"
                  style={{
                    boxShadow: "0px 2px 9px 9px rgba(251, 148, 31, 0.45)",
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

              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-sans text-base font-medium text-ink-700">
                    {person.name}
                  </span>
                  <span className="font-sans text-sm font-medium text-ink-200">
                    {person.distance}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-sans text-xs font-medium text-ink-400">
                    {person.chapter}
                  </span>
                  <span className="size-2 rounded-full bg-primary-500" />
                  <span className="rounded-full bg-ivory-200 px-3 py-1 font-sans text-xs font-medium text-ink-400">
                    {person.status}
                  </span>
                </div>
              </div>
            </div>

            <p className="font-sans text-sm text-ink-300">{person.message}</p>
          </div>

          <Button size="sm" fullWidth onClick={onConnect}>
            Connect
          </Button>
        </div>
      </div>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-6" aria-hidden="true">
      <path
        d="m5 5 14 14m0-14L5 19"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
