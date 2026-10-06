"use client";

import { LogTile } from "@/components/app/YourGrouvView";
import { cn } from "@/lib/cn";
import type { PickableMoment } from "@/lib/invites";

/** The key a picked moment is held under: log entries and posts share no ids. */
export const momentKey = (m: Pick<PickableMoment, "kind" | "id">) => `${m.kind}:${m.id}`;

/** Splits picked keys back into the two id lists the database takes. */
export function splitMomentKeys(keys: string[]) {
  return {
    logEntryIds: keys.filter((k) => k.startsWith("log:")).map((k) => k.slice(4)),
    postIds: keys.filter((k) => k.startsWith("post:")).map((k) => k.slice(5)),
  };
}

/**
 * "Story so far": the owner's own moments from this chapter as Grouv Log
 * tiles, three across; tapping one picks it. Only what's picked is ever
 * shared.
 */
export function MomentPicker({
  moments,
  picked,
  onToggle,
}: {
  moments: PickableMoment[];
  picked: string[];
  onToggle: (key: string) => void;
}) {
  if (moments.length === 0) {
    return (
      <p className="rounded-xl bg-ivory-100 px-4 py-6 text-center font-sans text-sm text-ink-300">
        No moments from this chapter yet. Log one, or post in this Space, and it can be shared here.
      </p>
    );
  }
  return (
    <ul className="grid grid-cols-3 gap-1.5 sm:gap-2">
      {moments.map((m) => {
        const key = momentKey(m);
        const on = picked.includes(key);
        return (
          <li key={key} className="relative">
            <LogTile entry={m} onOpen={() => onToggle(key)} />
            <span
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute inset-0 rounded-lg ring-inset transition-shadow sm:rounded-xl",
                on ? "ring-4 ring-primary-500" : "ring-0",
              )}
            />
            <span
              className={cn(
                "pointer-events-none absolute top-2 right-2 grid size-6 place-items-center rounded-full border-2",
                on ? "border-primary-500 bg-primary-500 text-white" : "border-white bg-black/20 text-transparent",
              )}
            >
              <svg viewBox="0 0 20 20" fill="none" className="size-3.5" aria-hidden="true">
                <path d="m4 10.5 4 4 8-9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="sr-only">{on ? "Picked" : "Not picked"}</span>
            </span>
            {m.kind === "post" && (
              <span className="pointer-events-none absolute top-2 left-2 rounded-full bg-surface/90 px-2 py-0.5 font-sans text-[10px] font-medium text-ink-600">
                Post
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
