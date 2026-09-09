"use client";

import Image from "next/image";
import { useState } from "react";
import { TopBar } from "@/components/app/TopBar";
import {
  ProximityCard,
  type NearbyPerson,
} from "@/components/app/ProximityCard";
import { useToast } from "@/components/app/ToastProvider";
import { Button } from "@/components/ui/Button";

/**
 * Nearby — Figma frames 357:7651 (off) and 476:15061 (proximity on).
 *
 * Off: the pulse graphic and the opt-in. On: the same pulse with the people
 * around you pinned across it (component 479:15290), each opening the
 * proximity card (481:15568). Copy is Figma's, including "Turn 0ff Proximity".
 */

/**
 * Pin coordinates from frame 476:15061, on its 511 x 461 stage, each with the
 * aura Figma gives that person. The three auras read as life stages; every
 * pin is component 479:15290 with its ring recoloured.
 */
const STAGE_W = 511;
const STAGE_H = 461;

const AURA = {
  amber: "#F0B231",
  lime: "#5EF01B",
  cyan: "#02D6EE",
} as const;

const PINS: [number, number, keyof typeof AURA][] = [
  [136, 387, "amber"],
  [188, 123, "lime"],
  [368, 347.5, "amber"],
  [119, 216, "amber"],
  [345, 229, "cyan"],
  [232, 221, "amber"],
  [152, 317, "lime"],
  [303, 326, "lime"],
  [298, 135, "amber"],
  [287, 53, "amber"],
  [92, 133, "amber"],
  [72, 267, "cyan"],
  [245, 403, "amber"],
  [459, 237, "amber"],
  [364, 419, "amber"],
  [64, 400, "amber"],
  [0, 216, "amber"],
  [71, 57, "cyan"],
  [218, 1, "lime"],
  [374, 38, "lime"],
  [364, 119.5, "cyan"],
];

/** The pin's two glows are its own colour, so they're mixed from the hex. */
function glow(hex: string, alpha: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

const FACES = [
  "/images/people/m1.png",
  "/images/people/m2.png",
  "/images/people/m3.png",
  "/images/people/m5.png",
  "/images/people/nina.png",
  "/images/people/dominion.png",
  "/images/people/jalen.png",
  "/images/people/john.png",
  "/images/people/lena.png",
];

/** Figma draws the card on Jalen Crestwood (481:15600). */
const PERSON: NearbyPerson = {
  name: "Jalen Crestwood",
  avatar: "/images/people/jalen.png",
  distance: "1.4KM away",
  chapter: "Career",
  status: "Mid-project",
  message:
    "“Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore”",
};

export default function NearbyPage() {
  const [on, setOn] = useState(false);
  const [selected, setSelected] = useState<NearbyPerson | null>(null);
  const toast = useToast();

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <TopBar title="Nearby" back="/home" />

      <div className="min-h-0 flex-1 scroll-slim overflow-y-auto p-4 lg:p-8">
        <div className="flex min-h-full items-center justify-center rounded-3xl bg-white p-6">
          <div className="flex w-full max-w-[556px] flex-col items-stretch gap-10 lg:gap-12">
            <div className="flex flex-col items-center gap-4">
              {on ? (
                <PulseWithPins onSelect={() => setSelected(PERSON)} />
              ) : (
                <Pulse />
              )}

              <div className="flex flex-col gap-2 text-center">
                <h1 className="font-display text-xl leading-[1.11] font-semibold text-ink-500 sm:text-2xl lg:text-3xl">
                  Grouv Nearby
                </h1>
                <p className="font-sans text-sm text-ink-300 lg:text-base">
                  {on
                    ? "You're open. People nearby in the same life stage can see you too. No events, no plans, just real connections happening right now."
                    : "See who’s in your chapter, right here, right now. No background tracking, ever."}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-center gap-2">
              {on ? (
                <button
                  type="button"
                  onClick={() => setOn(false)}
                  className="flex h-10 w-[278px] items-center justify-center gap-3 rounded-full border border-primary-600 px-6 font-ui text-sm font-medium text-primary-600 transition-colors hover:bg-primary-50"
                >
                  <LiveDot />
                  <MapPinIcon />
                  Turn 0ff Proximity
                </button>
              ) : (
                <Button
                  size="sm"
                  className="h-10 w-[278px]"
                  iconLeft={<MapPinIcon />}
                  onClick={() => setOn(true)}
                >
                  Turn on Proximity
                </Button>
              )}
              <p className="text-center font-sans text-sm text-ink-100">
                {on
                  ? "Turns off the moment you leave this page"
                  : "Turns off when you leave this page"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {selected && (
        <ProximityCard
          person={selected}
          onClose={() => setSelected(null)}
          onConnect={() => {
            setSelected(null);
            toast({
              title: "Connect request sent. We'll let you know when they accept.",
            });
          }}
        />
      )}
    </div>
  );
}

/** Figma 357:7657 — four concentric #727362 circles at decreasing opacity. */
function Pulse() {
  return (
    <svg
      viewBox="0 0 292 292"
      className="w-full max-w-[220px] lg:max-w-[292px]"
      aria-hidden="true"
    >
      <circle opacity="0.06" cx="144.5" cy="145" r="140" fill="#727362" />
      <circle opacity="0.1" cx="144.5" cy="146" r="105" fill="#727362" />
      <circle opacity="0.15" cx="144.5" cy="145" r="70" fill="#727362" />
      <circle opacity="0.5" cx="144.5" cy="145" r="35" fill="#727362" />
    </svg>
  );
}

/** Frame 476:15080 — the same rings with the 21 people pinned across them. */
function PulseWithPins({ onSelect }: { onSelect: () => void }) {
  return (
    <div
      className="relative w-full"
      style={{ aspectRatio: `${STAGE_W} / ${STAGE_H}` }}
    >
      <svg
        viewBox="0 0 511 461"
        className="absolute inset-0 size-full"
        aria-hidden="true"
      >
        <circle opacity="0.06" cx="255" cy="230" r="222" fill="#727362" />
        <circle opacity="0.1" cx="255" cy="230" r="166" fill="#727362" />
        <circle opacity="0.15" cx="255" cy="230" r="111" fill="#727362" />
        <circle opacity="0.5" cx="255" cy="230" r="55" fill="#727362" />
      </svg>

      {PINS.map(([x, y, aura], i) => (
        <button
          key={`${x}-${y}`}
          type="button"
          onClick={onSelect}
          className="absolute flex flex-col items-center gap-1 transition-transform hover:scale-110"
          style={{
            left: `${(x / STAGE_W) * 100}%`,
            top: `${(y / STAGE_H) * 100}%`,
            width: `${(52 / STAGE_W) * 100}%`,
          }}
        >
          {/* 40px disc in the aura colour, 32px portrait centred on it. */}
          <span
            className="grid aspect-square w-[76.9%] place-items-center rounded-full"
            style={{
              backgroundColor: AURA[aura],
              boxShadow: `0px 2px 9px 5px ${glow(AURA[aura], 0.2)}`,
            }}
          >
            <span
              className="relative size-4/5 overflow-hidden rounded-full"
              style={{ boxShadow: `0px 4px 5px 15px ${glow(AURA[aura], 0.45)}` }}
            >
              <Image
                src={FACES[i % FACES.length]}
                alt=""
                fill
                sizes="32px"
                className="object-cover"
              />
            </span>
          </span>
          <span className="whitespace-nowrap font-sans text-[11px] leading-tight text-ink-500">
            Oreoluwa
          </span>
        </button>
      ))}
    </div>
  );
}

/** Frame 480:15445 — three primary rings marking that proximity is live. */
function LiveDot() {
  return (
    <svg viewBox="0 0 12 12" className="size-3 shrink-0" aria-hidden="true">
      <circle cx="6" cy="6" r="6" fill="#F3701E" opacity="0.2" />
      <circle cx="6" cy="6" r="4.5" fill="#F3701E" opacity="0.35" />
      <circle cx="6" cy="6" r="3" fill="#F3701E" />
    </svg>
  );
}

function MapPinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-5" aria-hidden="true">
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
