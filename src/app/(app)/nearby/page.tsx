"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/app/Avatar";
import { TopBar } from "@/components/app/TopBar";
import { ProximityCard } from "@/components/app/ProximityCard";
import { SearchArt } from "@/components/app/SearchArt";
import { useToast } from "@/components/app/ToastProvider";
import { Button } from "@/components/ui/Button";
import {
  findNearby,
  shareProximity,
  stopProximity,
  waveNearby,
  type NearbyMatch,
  type ProximityMode,
} from "@/app/(app)/nearby/actions";
import { cn } from "@/lib/cn";
import { connectWith } from "@/lib/bond-actions";
import { getChapter } from "@/lib/chapters";

/**
 * Nearby — Figma frames 357:7651 (off) and 476:15061 (proximity on).
 *
 * Off: the pulse graphic and the opt-in. On: the same pulse with the people
 * around you pinned across it (component 479:15290), each opening the
 * proximity card (481:15568). Pins sit closer to the centre the nearer the
 * person is; their direction is deliberately arbitrary, since only rounded
 * distance ever leaves the database. Copy is Figma's, including "Turn 0ff
 * Proximity".
 *
 * The search starts at walking distance and widens one ring every 30 seconds
 * while nobody is found, stopping at 100 km. Two modes (the picker isn't in
 * Figma): Stage-only, the default, where only people at your exact stage see
 * you; and Open, where anyone nearby on Grouv can.
 *
 * Cross states (1207:22753 / 22788 / 22823): location denied, no one nearby,
 * and the readable list — shown when the browser only shares an approximate
 * area (so no distances at all), or on request as the accessible alternative
 * to the orbit (rounded distances only). The list is sorted by shared context.
 */
/** A fix this loose (metres) is an approximate area, not a position. */
const APPROXIMATE_M = 1000;
const STAGE_W = 511;
const STAGE_H = 461;
const RINGS_KM = [0.5, 1, 2, 5, 10, 25, 50, 100] as const;
const HEARTBEAT_MS = 60_000;
const LOOK_AROUND_MS = 30_000;

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
  const [mode, setMode] = useState<ProximityMode>("stage_only");
  const modeRef = useRef<ProximityMode>("stage_only");
  // Which ring the search has widened to.
  const [ring, setRing] = useState(0);
  // Cross states: permission denied, approximate location, the list view,
  // and whether a first look has come back yet.
  const [denied, setDenied] = useState(false);
  const [approximate, setApproximate] = useState(false);
  const [listView, setListView] = useState(false);
  const [looked, setLooked] = useState(false);
  const ringRef = useRef(0);
  const position = useRef<{ lat: number; lng: number } | null>(null);
  const watchId = useRef<number | null>(null);

  const turnOff = useCallback(() => {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
    position.current = null;
    ringRef.current = 0;
    setRing(0);
    setOn(false);
    setLooked(false);
    setApproximate(false);
    setPeople([]);
    void stopProximity();
  }, []);

  // Look within the current ring; if nobody's there, widen for next time.
  const lookAround = useCallback(async () => {
    const result = await findNearby(RINGS_KM[ringRef.current]);
    if (result.error) return;
    setPeople(result.people);
    setLooked(true);
    if (result.people.length === 0 && ringRef.current < RINGS_KM.length - 1) {
      ringRef.current += 1;
      setRing(ringRef.current);
    }
  }, []);

  const changeMode = (next: ProximityMode) => {
    modeRef.current = next;
    setMode(next);
    const fix = position.current;
    if (on && fix) void shareProximity(fix.lat, fix.lng, next).then(() => lookAround());
  };

  const turnOn = () => {
    if (!navigator.geolocation) {
      toast({ title: "This browser can't share your location", tone: "danger" });
      return;
    }
    setDenied(false);
    setStarting(true);
    watchId.current = navigator.geolocation.watchPosition(
      async ({ coords }) => {
        const first = position.current === null;
        position.current = { lat: coords.latitude, lng: coords.longitude };
        if (!first) return;
        setApproximate(coords.accuracy > APPROXIMATE_M);
        const result = await shareProximity(coords.latitude, coords.longitude, modeRef.current);
        setStarting(false);
        if (result.error) {
          toast({ title: result.error, tone: "danger" });
          turnOff();
          return;
        }
        setOn(true);
        void lookAround();
      },
      (failure) => {
        setStarting(false);
        if (failure.code === failure.PERMISSION_DENIED) setDenied(true);
        else toast({ title: "We couldn't find your location. Try again.", tone: "danger" });
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
      if (fix && document.visibilityState === "visible") void shareProximity(fix.lat, fix.lng, modeRef.current);
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
      else if (fix) void shareProximity(fix.lat, fix.lng, modeRef.current).then(() => lookAround());
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
        {denied ? (
          <NearbyState
            title="Turn on location to see who is nearby"
            body="Grouv Nearby needs location access to work. You control it completely — it only runs while you're on this page, and turns off the moment you leave."
            action={<DeniedActions onRetry={turnOn} onDismiss={() => setDenied(false)} />}
          />
        ) : on && looked && people.length === 0 ? (
          <NearbyState
            title="No one's nearby right now"
            body="Proximity is on and we're looking — this refreshes automatically as people come and go. Check back in a bit, or explore Groups and Events instead."
            note={ring < RINGS_KM.length - 1 ? `Looking within ${formatKm(RINGS_KM[ring])} now.` : undefined}
            action={
              <div className="flex flex-col items-center gap-2">
                <Button size="sm" className="w-[240px]" href="/events">
                  Browse Events nearby
                </Button>
                <Button variant="tertiary" size="sm" onClick={turnOff}>
                  Turn off Proximity
                </Button>
              </div>
            }
          />
        ) : on && (approximate || listView) ? (
          <PeopleList
            people={people}
            approximate={approximate}
            onSelect={setSelected}
            onShowMap={approximate ? undefined : () => setListView(false)}
            onTurnOff={turnOff}
          />
        ) : (
        <div className="flex min-h-full items-center justify-center rounded-3xl bg-surface p-6">
          <div className="flex w-full max-w-[556px] flex-col items-stretch gap-10 lg:gap-12">
            <div className="flex flex-col items-center gap-4">
              {on ? (
                <PulseWithPins people={people} radiusKm={RINGS_KM[ring]} onSelect={setSelected} />
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
                      ? mode === "open"
                        ? "You're open. Anyone nearby on Grouv can see you. No events, no plans, just real connections happening right now."
                        : "You're open to your stage. Only people at your exact stage nearby can see you."
                      : ring < RINGS_KM.length - 1
                        ? `No one within ${formatKm(RINGS_KM[ring])} yet. We'll look a little further every 30 seconds while this page is open.`
                        : "No one is nearby within 100 km right now. That's the honest answer. Try again another time."
                    : "See who’s in your chapter, right here, right now. No background tracking, ever."}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-center gap-2">
              <ModePicker mode={mode} onChange={changeMode} />
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
              {on && people.length > 0 && (
                <button
                  type="button"
                  onClick={() => setListView(true)}
                  className="font-sans text-sm font-medium text-primary-600 hover:underline"
                >
                  Show as a list
                </button>
              )}
            </div>
          </div>
        </div>
        )}
      </div>

      {selected && (
        <ProximityCard
          person={selected}
          hideDistance={approximate}
          canWave={selected.sameStage && !selected.iWaved}
          onWave={async () => {
            const result = await waveNearby(selected.userId);
            if (result.error) {
              toast({ title: result.error, tone: "danger" });
              return;
            }
            setPeople((prev) => prev.map((p) => (p.userId === selected.userId ? { ...p, iWaved: true } : p)));
            setSelected(null);
            toast({ title: `You waved at ${selected.name}` });
          }}
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

/** Cross 1207:22753 / 1207:22788 — the illustration over a title, copy and actions. */
function NearbyState({
  title,
  body,
  note,
  action,
}: {
  title: string;
  body: string;
  note?: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full items-center justify-center rounded-3xl bg-surface p-6">
      <div className="flex w-full max-w-[460px] flex-col items-center gap-4 text-center" role="status">
        <SearchArt />
        <div className="flex flex-col gap-2">
          <h1 className="font-sans text-xl font-semibold text-ink-700">{title}</h1>
          <p className="font-sans text-sm text-ink-300">{body}</p>
          {note && <p className="font-sans text-xs text-ink-200">{note}</p>}
        </div>
        {action}
      </div>
    </div>
  );
}

/**
 * "Open Settings". A web page can't open the browser's site settings, so the
 * button says where the switch is, then offers to ask again.
 */
function DeniedActions({ onRetry, onDismiss }: { onRetry: () => void; onDismiss: () => void }) {
  const [help, setHelp] = useState(false);
  return (
    <div className="flex flex-col items-center gap-2">
      {help ? (
        <>
          <p className="max-w-[380px] font-sans text-sm text-ink-400">
            Tap the lock or settings icon beside this site&rsquo;s address, set Location to Allow, then
            try again. On a phone, also check that your browser is allowed to use location.
          </p>
          <Button size="sm" className="w-[240px]" onClick={onRetry}>
            Try again
          </Button>
        </>
      ) : (
        <Button size="sm" className="w-[240px]" onClick={() => setHelp(true)}>
          Open Settings
        </Button>
      )}
      <Button variant="tertiary" size="sm" onClick={onDismiss}>
        Not now
      </Button>
    </div>
  );
}

/**
 * Cross 1207:22823 — "People nearby" as a readable list, sorted by how much
 * you have in common: same stage first, then anyone who waved, then nearest.
 * With an approximate area there's no distance at all; otherwise only the
 * rounded one ("about 2 km").
 */
function PeopleList({
  people,
  approximate,
  onSelect,
  onShowMap,
  onTurnOff,
}: {
  people: NearbyMatch[];
  approximate: boolean;
  onSelect: (person: NearbyMatch) => void;
  onShowMap?: () => void;
  onTurnOff: () => void;
}) {
  const toast = useToast();
  const [connecting, setConnecting] = useState<string | null>(null);
  const sorted = [...people].sort(
    (a, b) =>
      Number(b.sameStage) - Number(a.sameStage) ||
      Number(b.wavedAtMe) - Number(a.wavedAtMe) ||
      (approximate ? a.name.localeCompare(b.name) : a.distanceKm - b.distanceKm),
  );

  const connect = async (person: NearbyMatch) => {
    setConnecting(person.userId);
    const result = await connectWith(person.userId);
    setConnecting(null);
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
  };

  return (
    <div className="min-h-full rounded-3xl bg-surface p-6 lg:p-10">
      <div className="flex w-full max-w-[640px] flex-col gap-6">
        <header className="flex flex-col gap-1">
          <h1 className="font-sans text-xl font-semibold text-ink-700">People nearby</h1>
          <p className="font-sans text-sm text-ink-300">
            {approximate
              ? "You've shared an approximate area instead of a precise location, so we can't show exact distance — here's who's around, sorted by how much you have in common."
              : "Everyone around you, sorted by how much you have in common. Distances are rounded, never exact."}
          </p>
        </header>
        <ul className="flex flex-col gap-3">
          {sorted.map((person) => {
            const chapter = getChapter(person.chapterSlug)?.name ?? person.chapterSlug;
            return (
              <li key={person.userId} className="flex items-center gap-3 rounded-lg border border-ink-50 p-3">
                <button
                  type="button"
                  onClick={() => onSelect(person)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <Avatar src={person.avatarUrl} name={person.name} userId={person.userId} sizes="40px" className="size-10" />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-sans text-sm font-semibold text-ink-700">
                      {person.name}
                      {person.wavedAtMe && <span className="font-normal text-ink-300"> · waved at you</span>}
                    </span>
                    <span className="truncate font-sans text-xs text-ink-300">
                      {chapter} · {person.phase}
                      {!approximate && ` · about ${roundedKm(person.distanceKm)}`}
                    </span>
                  </span>
                </button>
                <Button
                  size="sm"
                  loading={connecting === person.userId}
                  onClick={() => void connect(person)}
                >
                  Connect
                </Button>
              </li>
            );
          })}
        </ul>
        <div className="flex flex-wrap items-center gap-4">
          {onShowMap && (
            <Button variant="secondary" size="sm" onClick={onShowMap}>
              Show the map
            </Button>
          )}
          <Button variant="tertiary" size="sm" onClick={onTurnOff}>
            Turn off Proximity
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Whole kilometres (or "under 1 km"): never finer than the orbit shows. */
function roundedKm(km: number) {
  return km < 1 ? "under 1 km" : `${Math.round(km)} km`;
}

function formatKm(km: number) {
  return km < 1 ? `${km * 1000} m` : `${km} km`;
}

/** Stage-only (default) or Open. Not in Figma. */
function ModePicker({ mode, onChange }: { mode: ProximityMode; onChange: (mode: ProximityMode) => void }) {
  const options: { value: ProximityMode; label: string }[] = [
    { value: "stage_only", label: "Stage-only" },
    { value: "open", label: "Open" },
  ];
  return (
    <div role="radiogroup" aria-label="Who can see you" className="mb-2 flex rounded-full bg-ivory-200 p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={mode === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-full px-4 py-1.5 font-ui text-sm font-medium transition-colors",
            mode === option.value ? "bg-surface text-ink-700 shadow-sm" : "text-ink-400 hover:text-ink-600",
          )}
        >
          {option.label}
        </button>
      ))}
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
  radiusKm,
  onSelect,
}: {
  people: NearbyMatch[];
  radiusKm: number;
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
        const r = 70 + Math.min(person.distanceKm / radiusKm, 1) * 140;
        const angle = angleFor(person.userId);
        const x = cx + Math.cos(angle) * r - 26;
        const y = cy + Math.sin(angle) * r - 26;
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
            {/* The 40px pin: a 32px natural portrait in its aura ring. */}
            <span className="grid aspect-square w-[76.9%] place-items-center">
              <Avatar src={person.avatarUrl} name={person.name} aura={person.aura} sizes="32px" className="size-4/5" />
            </span>
            <span className="whitespace-nowrap font-sans text-[11px] leading-tight text-ink-500">
              {person.name}
              {person.wavedAtMe && " · waved"}
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
