"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/app/Avatar";
import { TopBar } from "@/components/app/TopBar";
import { ProximityCard } from "@/components/app/ProximityCard";
import { useToast } from "@/components/app/ToastProvider";
import { Button } from "@/components/ui/Button";
import { findNearby, shareProximity, stopProximity, type NearbyMatch } from "@/app/(app)/nearby/actions";
import { connectWith } from "@/lib/bond-actions";

/**
 * Nearby — Figma frames 357:7651 (off) and 476:15061 (proximity on).
 *
 * Off: the pulse graphic and the opt-in. On: the same pulse with the people
 * around you pinned across it (component 479:15290), each opening the
 * proximity card (481:15568). Pins sit closer to the centre the nearer the
 * person is; their direction is deliberately arbitrary, since only rounded
 * distance ever leaves the database. Copy is Figma's, including "Turn 0ff
 * Proximity".
 */
const STAGE_W = 511;
const STAGE_H = 461;
const RADIUS_KM = 5;
const HEARTBEAT_MS = 60_000;
const LOOK_AROUND_MS = 20_000;

/** Figma's three pin auras (amber, lime, cyan) plus two for the other auras. */
const AURA_COLOR: Record<NearbyMatch["aura"], string> = {
  in_transition: "#F0B231",
  reflective: "#5EF01B",
  deep_focus: "#02D6EE",
  open_to_connect: "#B27CFD",
  active_nearby: "#F57E16",
};

/** The pin's two glows are its own colour, so they're mixed from the hex. */
function glow(hex: string, alpha: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** A stable angle per person, so pins don't jump between refreshes. */
function angleFor(userId: string) {
  let hash = 0;
  for (const char of userId) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return (hash % 360) * (Math.PI / 180);
}

export default function NearbyPage() {
  const toast = useToast();
  const [on, setOn] = useState(false);
  const [starting, setStarting] = useState(false);
  const [people, setPeople] = useState<NearbyMatch[]>([]);
  const [selected, setSelected] = useState<NearbyMatch | null>(null);
  const position = useRef<{ lat: number; lng: number } | null>(null);
  const watchId = useRef<number | null>(null);

  const turnOff = useCallback(() => {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
    position.current = null;
    setOn(false);
    setPeople([]);
    void stopProximity();
  }, []);

  const lookAround = useCallback(async () => {
    const result = await findNearby(RADIUS_KM);
    if (!result.error) setPeople(result.people);
  }, []);

  const turnOn = () => {
    if (!navigator.geolocation) {
      toast({ title: "This browser can't share your location", tone: "danger" });
      return;
    }
    setStarting(true);
    watchId.current = navigator.geolocation.watchPosition(
      async ({ coords }) => {
        const first = position.current === null;
        position.current = { lat: coords.latitude, lng: coords.longitude };
        if (!first) return;
        const result = await shareProximity(coords.latitude, coords.longitude);
        setStarting(false);
        if (result.error) {
          toast({ title: result.error, tone: "danger" });
          turnOff();
          return;
        }
        setOn(true);
        void lookAround();
      },
      () => {
        setStarting(false);
        toast({ title: "Location permission was declined", tone: "danger" });
        turnOff();
      },
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 15_000 },
    );
  };

  // While on: keep the session alive and keep looking.
  useEffect(() => {
    if (!on) return;
    const heartbeat = setInterval(() => {
      const fix = position.current;
      // A hidden tab has "left the page"; don't quietly switch back on.
      if (fix && document.visibilityState === "visible") void shareProximity(fix.lat, fix.lng);
    }, HEARTBEAT_MS);
    const look = setInterval(() => void lookAround(), LOOK_AROUND_MS);
    return () => {
      clearInterval(heartbeat);
      clearInterval(look);
    };
  }, [on, lookAround]);

  // "Turns off the moment you leave this page."
  useEffect(() => {
    if (!on) return;
    const leave = () => navigator.sendBeacon("/api/proximity/off");
    const onVisibility = () => {
      const fix = position.current;
      if (document.visibilityState === "hidden") leave();
      else if (fix) void shareProximity(fix.lat, fix.lng).then(() => lookAround());
    };
    window.addEventListener("pagehide", leave);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", leave);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [on, lookAround]);

  // Leaving the route inside the app.
  useEffect(() => () => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      void stopProximity();
    }
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <TopBar title="Nearby" back="/home" />

      <div className="min-h-0 flex-1 scroll-slim overflow-y-auto p-4 lg:p-8">
        <div className="flex min-h-full items-center justify-center rounded-3xl bg-surface p-6">
          <div className="flex w-full max-w-[556px] flex-col items-stretch gap-10 lg:gap-12">
            <div className="flex flex-col items-center gap-4">
              {on ? (
                <PulseWithPins people={people} onSelect={setSelected} />
              ) : (
                <Pulse />
              )}

              <div className="flex flex-col gap-2 text-center">
                <h1 className="font-display text-xl leading-[1.11] font-semibold text-ink-500 sm:text-2xl lg:text-3xl">
                  Grouv Nearby
                </h1>
                <p className="font-sans text-sm text-ink-300 lg:text-base">
                  {on
                    ? people.length > 0
                      ? "You're open. People nearby in the same life stage can see you too. No events, no plans, just real connections happening right now."
                      : "You're open. No one in your chapters is nearby right now — we'll keep looking while this page is open."
                    : "See who’s in your chapter, right here, right now. No background tracking, ever."}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-center gap-2">
              {on ? (
                <button
                  type="button"
                  onClick={turnOff}
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
                  loading={starting}
                  onClick={turnOn}
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
          onConnect={async () => {
            const result = await connectWith(selected.userId);
            setSelected(null);
            toast(
              result.error
                ? { title: result.error, tone: "danger" }
                : {
                    title:
                      result.status === "accepted"
                        ? "You're connected"
                        : "Connect request sent. We'll let you know when they accept.",
                  },
            );
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

/** Frame 476:15080 — the same rings with the people nearby pinned across them. */
function PulseWithPins({
  people,
  onSelect,
}: {
  people: NearbyMatch[];
  onSelect: (person: NearbyMatch) => void;
}) {
  const cx = 255;
  const cy = 230;

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

      {people.map((person) => {
        // Nearest people just outside the core ring, farthest at the edge.
        const r = 70 + Math.min(person.distanceKm / RADIUS_KM, 1) * 140;
        const angle = angleFor(person.userId);
        const x = cx + Math.cos(angle) * r - 26;
        const y = cy + Math.sin(angle) * r - 26;
        const color = AURA_COLOR[person.aura];
        return (
          <button
            key={person.userId}
            type="button"
            onClick={() => onSelect(person)}
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
              style={{ backgroundColor: color, boxShadow: `0px 2px 9px 5px ${glow(color, 0.2)}` }}
            >
              <span
                className="relative size-4/5 overflow-hidden rounded-full"
                style={{ boxShadow: `0px 4px 5px 15px ${glow(color, 0.45)}` }}
              >
                <Avatar src={person.avatarUrl} name={person.name} sizes="32px" className="size-full" />
              </span>
            </span>
            <span className="whitespace-nowrap font-sans text-[11px] leading-tight text-ink-500">
              {person.name}
            </span>
          </button>
        );
      })}
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
