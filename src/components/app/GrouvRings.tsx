"use client";

import Link from "next/link";
import { useState } from "react";
import { Avatar } from "@/components/app/Avatar";
import { useViewer } from "@/components/app/ViewerProvider";
import { cn } from "@/lib/cn";
import { auraLabel, AURAS } from "@/lib/profile";

/**
 * Your Grouv rings — Figma component 489:17418 (used in frames 417:16407 and
 * 435:18506).
 *
 * A 390x401 stage carries three concentric rings (380 / 280 / 180), your
 * portrait at the centre and up to four people from your bonds and circle on
 * them, with the three layer badges pinned at Figma's coordinates. Tapping a
 * layer shows what you wrote for it: Struggling with is your Honest tension,
 * Building is Sitting with, Open to is Open to.
 */
const STAGE_W = 390;
const STAGE_H = 401;

/** Percent helpers so the Figma pixel values below stay readable. */
const x = (px: number) => `${(px / STAGE_W) * 100}%`;
const y = (px: number) => `${(px / STAGE_H) * 100}%`;
const w = (px: number) => `${(px / STAGE_W) * 100}%`;

type Layer = "open" | "building" | "struggling";

export interface RingPerson {
  userId: string;
  name: string;
  avatarUrl: string | null;
  relationship: "bond" | "circle";
}

export type RingPrompts = Record<Layer, string | null>;

/** The three rings, outermost first — Ellipse 15 / 16 / 17. */
const RINGS: { id: Layer; size: number; left: number; top: number; stroke: string }[] = [
  { id: "open", size: 380, left: 5, top: 21, stroke: "border-success-20" },
  { id: "building", size: 280, left: 55, top: 71, stroke: "border-warning-10" },
  { id: "struggling", size: 180, left: 105, top: 121, stroke: "border-destructive-20" },
];

/** Badge Text instances I491:9583;489:17358–17360. */
const BADGES: { id: Layer; label: string; left: number; top: number; className: string; empty: string }[] = [
  {
    id: "open",
    label: "OPEN TO",
    left: 159,
    top: 0,
    className: "bg-success-5 text-success-50",
    empty: "Who or what you're open to right now.",
  },
  {
    id: "building",
    label: "BUILDING",
    left: 156,
    top: 52,
    className: "bg-warning-5 text-warning-40",
    empty: "What you're sitting with and building through.",
  },
  {
    id: "struggling",
    label: "STRUGGLING WITH",
    left: 119,
    top: 104,
    className: "bg-destructive-5 text-destructive-50",
    empty: "The honest tension you're carrying.",
  },
];

/** The four 40px member spots — frames 1618868318 / 19 / 23 / 22. */
const SPOTS: { left: number; top: number; tint: string }[] = [
  { left: 21, top: 161, tint: "bg-success-10" },
  { left: 314, top: 125, tint: "bg-warning-10" },
  { left: 310, top: 269, tint: "bg-[#E4F7FF]" },
  { left: 111, top: 342, tint: "bg-destructive-10" },
];

export function GrouvRings({ people, prompts }: { people: RingPerson[]; prompts: RingPrompts }) {
  const viewer = useViewer();
  const [entered, setEntered] = useState<Layer | null>(null);
  const aura = AURAS.find((a) => a.value === viewer.aura);
  const badge = BADGES.find((b) => b.id === entered);

  return (
    <section className="flex flex-col items-center gap-10 rounded-2xl bg-surface px-5 py-10 lg:flex-row lg:items-center lg:gap-[78px] lg:px-20">
      <div className="flex w-full max-w-[390px] shrink-0 flex-col gap-6">
        <div
          className="relative w-full"
          style={{ aspectRatio: `${STAGE_W} / ${STAGE_H}` }}
        >
          {RINGS.map((ring) => (
            <span
              key={ring.id}
              aria-hidden="true"
              className={cn(
                "absolute rounded-full border-2 transition-[border-width]",
                ring.stroke,
                entered === ring.id && "border-4",
              )}
              style={{
                left: x(ring.left),
                top: y(ring.top),
                width: w(ring.size),
                aspectRatio: "1",
              }}
            />
          ))}

          {/* Frame 1618868315 — your portrait, ringed by Ellipse 18. */}
          <span
            className="absolute"
            style={{ left: x(175), top: y(169), width: w(40), aspectRatio: "1" }}
          >
            <span className="absolute -inset-[20%] rounded-full border border-primary-100" />
            <Avatar
              src={viewer.avatarUrl}
              name={viewer.firstName}
              sizes="40px"
              className="relative size-full"
            />
          </span>

          {people.slice(0, SPOTS.length).map((person, i) => {
            const spot = SPOTS[i];
            return (
              <Link
                key={person.userId}
                href={`/bonds?with=${person.userId}`}
                title={person.name}
                className={cn(
                  "absolute grid place-items-center rounded-full p-1 transition-transform hover:scale-110",
                  spot.tint,
                )}
                style={{ left: x(spot.left), top: y(spot.top), width: w(40), aspectRatio: "1" }}
              >
                <Avatar src={person.avatarUrl} name={person.name} sizes="40px" className="size-full" />
                <span className="sr-only">{person.name}</span>
              </Link>
            );
          })}

          {BADGES.map((b) => (
            <button
              key={b.id}
              type="button"
              aria-pressed={entered === b.id}
              onClick={() => setEntered((v) => (v === b.id ? null : b.id))}
              className={cn(
                "absolute rounded-full px-3 py-1.5 font-ui text-sm font-semibold whitespace-nowrap transition-shadow",
                b.className,
                entered === b.id && "ring-2 ring-current",
              )}
              style={{ left: x(b.left), top: y(b.top) }}
            >
              {b.label}
            </button>
          ))}
        </div>

        <p className="text-center font-sans text-sm font-medium text-ink-300 uppercase">
          Tap a ring to enter
        </p>
      </div>

      <div className="flex w-full flex-col gap-4 lg:max-w-[468px]">
        {/* Frame 1618868182 — the YOU card. */}
        <div className="flex flex-col gap-3 rounded-2xl border border-ink-50 bg-ivory-50 px-5 py-6">
          <span className="font-sans text-lg font-semibold text-ink-800">
            YOU
          </span>
          <div className="flex flex-wrap gap-4">
            {viewer.chapters[0] && (
              <span className="flex items-center gap-1 rounded-full bg-ivory-500 px-2 py-1 font-sans text-xs font-medium text-ink-400">
                <TrendUpIcon className="size-3" />
                {viewer.chapters[0].phase}
              </span>
            )}
            <span className="flex items-center gap-1 rounded-full bg-ivory-500 px-2 py-1 font-sans text-xs font-medium text-ink-400">
              <span className={cn("size-1.5 rounded-full", aura?.dot === "bg-surface" ? "bg-primary-600" : aura?.dot)} />
              {auraLabel(viewer.aura)}
            </span>
          </div>
          {viewer.locationLabel && (
            <span className="flex items-center gap-2 font-sans text-sm font-medium text-ink-400">
              <PinIcon className="size-6 shrink-0" />
              {viewer.locationLabel}
            </span>
          )}
        </div>

        {/* Frame 1618868328 — the explainer, or the layer you stepped into. */}
        {badge ? (
          <div className="flex flex-col gap-2 rounded-2xl border border-ink-50 bg-ivory-50 px-5 py-6">
            <span className={cn("w-fit rounded-full px-3 py-1 font-ui text-xs font-semibold", badge.className)}>
              {badge.label}
            </span>
            <p className="font-sans text-base whitespace-pre-line text-ink-500">
              {prompts[badge.id] ?? badge.empty}
            </p>
            {!prompts[badge.id] && (
              <Link href="/settings/edit-profile" className="font-sans text-sm font-medium text-primary-600 hover:underline">
                Add it in Edit Profile
              </Link>
            )}
          </div>
        ) : (
          <p className="rounded-2xl border border-ink-50 bg-ivory-50 px-5 py-6 font-sans text-base text-ink-300">
            You&rsquo;re standing in the middle of your own Grouv. Each ring is a
            layer of where you are, struggling, building, open to. Step into one.
          </p>
        )}
      </div>
    </section>
  );
}

function TrendUpIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path
        d="M2 11 6 7l3 3 5-5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.5 5H14v3.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 2.5a6.5 6.5 0 0 1 6.5 6.5c0 4.8-6.5 12.5-6.5 12.5S5.5 13.8 5.5 9A6.5 6.5 0 0 1 12 2.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="9" r="2.2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
