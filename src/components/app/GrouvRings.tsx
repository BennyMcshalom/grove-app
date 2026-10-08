"use client";

import Link from "next/link";
import { useState } from "react";
import { Avatar, grouvHref } from "@/components/app/Avatar";
import { useViewer } from "@/components/app/ViewerProvider";
import { getChapter } from "@/lib/chapters";
import { birthdayLabel } from "@/lib/profile-audience";
import { cn } from "@/lib/cn";
import { auraLabel, AURAS, type Aura } from "@/lib/profile";

/**
 * Grouv rings — Figma component 489:17418 (used in frames 417:16407 and
 * 435:18506). Your Grouv and everyone else's Grouv (/people/<id>) share it.
 *
 * A 390x401 stage carries three concentric rings (380 / 280 / 180), the
 * person's portrait at the centre and up to four people on them, with the
 * three layer badges pinned at Figma's coordinates. Tapping a layer shows
 * what they wrote for it: Struggling with is their Honest tension, Building
 * is Sitting with, Open to is Open to. Beside it, their card: name (YOU on
 * your own), a Space · stage chip per open chapter, aura and location.
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
  aura?: Aura;
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

/**
 * The four 40px member spots — frames 1618868318 / 19 / 23 / 22. Figma sat
 * each on a tinted disc; photos are natural now, ringed by their aura.
 */
const SPOTS: { left: number; top: number }[] = [
  { left: 21, top: 161 },
  { left: 314, top: 125 },
  { left: 310, top: 269 },
  { left: 111, top: 342 },
];

/** Whose Grouv this is. */
export interface GrouvSubject {
  id: string;
  name: string;
  avatarUrl: string | null;
  aura: Aura;
  locationLabel: string | null;
  /** Open chapters, primary first. */
  chapters: { slug: string; phase: string }[];
  /** Bio and birthday ("YYYY-MM-DD"), when their audience lets the viewer see them. */
  bio?: string | null;
  birthday?: string | null;
  /** Your own Grouv: the card says YOU and empty layers link to Edit Profile. */
  self: boolean;
}

export function GrouvRings({
  subject,
  people,
  prompts,
  promptsHidden = false,
  label,
  children,
}: {
  subject: GrouvSubject;
  people: RingPerson[];
  prompts: RingPrompts;
  /** Their prompts are for their Bonds only (RLS) and weren't readable. */
  promptsHidden?: boolean;
  /** A small pill beside the name: "In your circle", "Bonded"… */
  label?: string | null;
  /** Under the card's details: the actions on someone else's Grouv. */
  children?: React.ReactNode;
}) {
  const viewer = useViewer();
  const [entered, setEntered] = useState<Layer | null>(null);
  const aura = AURAS.find((a) => a.value === subject.aura);
  const badge = BADGES.find((b) => b.id === entered);

  return (
    <section className="flex flex-col items-center gap-10 rounded-2xl bg-surface px-5 py-10 lg:flex-row lg:items-center lg:justify-center lg:gap-[78px] lg:px-20">
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

          {/* Frame 1618868315 — their portrait, ringed by Ellipse 18. */}
          <span
            className="absolute"
            style={{ left: x(175), top: y(169), width: w(40), aspectRatio: "1" }}
          >
            <span className="absolute -inset-[20%] rounded-full border border-primary-100" />
            <Avatar
              src={subject.avatarUrl}
              name={subject.name}
              aura={subject.aura}
              sizes="40px"
              className="relative size-full"
            />
          </span>

          {people.slice(0, SPOTS.length).map((person, i) => {
            const spot = SPOTS[i];
            return (
              <Link
                key={person.userId}
                // On your own Grouv a face opens your chat; on someone
                // else's, that person's Grouv (or yours, if it's you).
                href={subject.self ? `/bonds?with=${person.userId}` : grouvHref(person.userId, viewer.id)}
                title={person.userId === viewer.id ? "You" : person.name}
                className="absolute grid place-items-center rounded-full transition-transform hover:scale-110"
                style={{ left: x(spot.left), top: y(spot.top), width: w(40), aspectRatio: "1" }}
              >
                <Avatar src={person.avatarUrl} name={person.name} aura={person.aura} sizes="40px" className="size-full" />
                <span className="sr-only">{person.userId === viewer.id ? "You" : person.name}</span>
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

      <div className="flex w-full min-w-0 flex-col gap-4 lg:max-w-[468px]">
        {/* Frame 1618868182 — the YOU card, or theirs. */}
        <div className="flex flex-col gap-3 rounded-2xl border border-ink-50 bg-ivory-50 px-5 py-6">
          <div className="flex flex-wrap items-center gap-2">
            {subject.self ? (
              <span className="font-sans text-lg font-semibold text-ink-800">YOU</span>
            ) : (
              <h1 className="font-sans text-lg font-semibold text-ink-800">{subject.name}</h1>
            )}
            {label && (
              <span className="rounded-full bg-primary-50 px-2.5 py-0.5 font-sans text-xs font-medium text-primary-800">
                {label}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {subject.chapters.map((chapter) => (
              <span
                key={chapter.slug}
                className="flex items-center gap-1 rounded-full bg-ivory-500 px-2 py-1 font-sans text-xs font-medium text-ink-400"
              >
                <TrendUpIcon className="size-3 shrink-0" />
                {getChapter(chapter.slug)?.name ?? chapter.slug} · {chapter.phase}
              </span>
            ))}
            <span className="flex items-center gap-1 rounded-full bg-ivory-500 px-2 py-1 font-sans text-xs font-medium text-ink-400">
              <span className={cn("size-1.5 rounded-full", aura?.dot)} />
              {auraLabel(subject.aura)}
            </span>
          </div>
          {subject.locationLabel && (
            <span className="flex items-center gap-2 font-sans text-sm font-medium text-ink-400">
              <PinIcon className="size-6 shrink-0" />
              {subject.locationLabel}
            </span>
          )}
          {subject.birthday && (
            <span className="flex items-center gap-2 font-sans text-sm font-medium text-ink-400">
              <CakeIcon className="size-6 shrink-0" />
              Birthday · {birthdayLabel(subject.birthday)}
            </span>
          )}
          {subject.bio && <p className="font-sans text-sm whitespace-pre-line text-ink-500">{subject.bio}</p>}
          {children}
        </div>

        {/* Frame 1618868328 — the explainer, or the layer you stepped into. */}
        {badge ? (
          <div className="flex flex-col gap-2 rounded-2xl border border-ink-50 bg-ivory-50 px-5 py-6">
            <span className={cn("w-fit rounded-full px-3 py-1 font-ui text-xs font-semibold", badge.className)}>
              {badge.label}
            </span>
            <p className={cn("font-sans text-base whitespace-pre-line", prompts[badge.id] ? "text-ink-500" : "text-ink-300")}>
              {prompts[badge.id] ??
                (subject.self
                  ? badge.empty
                  : promptsHidden
                    ? `Only ${subject.name}'s Bonds can read what's in this ring.`
                    : `${subject.name} hasn't written this one yet.`)}
            </p>
            {subject.self && !prompts[badge.id] && (
              <Link href="/settings/edit-profile" className="font-sans text-sm font-medium text-primary-600 hover:underline">
                Add it in Edit Profile
              </Link>
            )}
          </div>
        ) : (
          <p className="rounded-2xl border border-ink-50 bg-ivory-50 px-5 py-6 font-sans text-base text-ink-300">
            {subject.self ? (
              <>
                You&rsquo;re standing in the middle of your own Grouv. Each ring is a
                layer of where you are, struggling, building, open to. Step into one.
              </>
            ) : (
              <>
                You&rsquo;re standing in {subject.name}&rsquo;s Grouv. Each ring is a layer of
                where they are, struggling, building, open to. Step into one.
              </>
            )}
          </p>
        )}
      </div>
    </section>
  );
}

function CakeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M4.5 20.5v-7a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v7M3 20.5h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M4.5 15.5c1.5 1.3 3 1.3 4.5 0s3-1.3 4.5 0 3 1.3 4.5 0 1.5-.7 1.5-.7M12 11.5V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 3.5c.9 1 1.2 1.9.8 2.6a.9.9 0 0 1-1.6 0c-.4-.7-.1-1.6.8-2.6Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
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
