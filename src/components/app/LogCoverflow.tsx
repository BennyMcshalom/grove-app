"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Photo } from "@/components/ui/Media";
import { getChapter } from "@/lib/chapters";
import { cn } from "@/lib/cn";
import { logDateLabel, type LogEntry } from "@/lib/log";

/**
 * Grouv Log moments as a cover-flow: the current moment large in the middle,
 * its neighbours shrinking and turning away on either side (the visionOS
 * gallery look). It's meant to feel like flicking through a week, which is
 * what the weekly wrap will build on.
 *
 * How it moves, and why:
 *  - Drag (mouse, pen or finger) moves the whole stack with your hand; on
 *    release it settles on the nearest card, and a quick flick carries on to
 *    the next one even if you didn't drag far — the way iOS pickers feel.
 *  - Trackpads' sideways scroll and the ← → keys step one card at a time.
 *  - Tapping a card at the side brings it to the front; tapping the front
 *    card opens that moment full size.
 *  - Only cards within three places of the front are drawn, so a long log
 *    stays smooth; pictures load as they come into that window.
 *  - With "reduce motion" on, cards jump instead of gliding.
 */
const VISIBLE = 3;

export function LogCoverflow({
  entries,
  tone = "warm",
  className,
}: {
  /** Newest first; the newest starts in front. */
  entries: LogEntry[];
  /** "warm": on the orange Grouv Log panel. "plain": on a white card. */
  tone?: "warm" | "plain";
  className?: string;
}) {
  const [active, setActive] = useState(0);
  // Cards' worth of in-progress drag (positive = dragging right).
  const [drag, setDrag] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [opened, setOpened] = useState<LogEntry | null>(null);
  const stage = useRef<HTMLDivElement>(null);
  const gesture = useRef<{ x: number; t: number; lastX: number; lastT: number; moved: boolean; id: number } | null>(null);
  const wheelLock = useRef(0);
  // The click that ends a drag isn't a tap on whichever card is under it.
  const justDragged = useRef(false);
  const count = entries.length;

  const go = useCallback(
    (index: number) => setActive(Math.max(0, Math.min(count - 1, index))),
    [count],
  );

  /** How far one card step is, in pixels, at the current size. */
  const stepPx = () => (stage.current?.clientWidth ?? 600) * 0.22;

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    gesture.current = { x: e.clientX, t: e.timeStamp, lastX: e.clientX, lastT: e.timeStamp, moved: false, id: e.pointerId };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const g = gesture.current;
    if (!g || g.id !== e.pointerId) return;
    const dx = e.clientX - g.x;
    if (!g.moved && Math.abs(dx) > 6) {
      g.moved = true;
      setDragging(true);
      stage.current?.setPointerCapture(e.pointerId);
    }
    if (!g.moved) return;
    g.lastX = e.clientX;
    g.lastT = e.timeStamp;
    // Resist past the ends, like a rubber band.
    let cards = dx / stepPx();
    if ((active === 0 && cards > 0) || (active === count - 1 && cards < 0)) cards *= 0.3;
    setDrag(cards);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const g = gesture.current;
    gesture.current = null;
    if (!g || !g.moved) return;
    const dx = e.clientX - g.x;
    const recent = e.timeStamp - g.lastT < 80 ? (e.clientX - g.x) / Math.max(1, e.timeStamp - g.t) : 0;
    let target = Math.round(active - dx / stepPx());
    // A flick (fast, short) still moves one card.
    if (target === active && Math.abs(recent) > 0.45) target = active - Math.sign(recent);
    setDrag(0);
    setDragging(false);
    justDragged.current = true;
    setTimeout(() => (justDragged.current = false), 0);
    go(target);
  };

  const onWheel = (e: React.WheelEvent) => {
    // Sideways trackpad swipes only; vertical wheel keeps scrolling the page.
    if (Math.abs(e.deltaX) < Math.abs(e.deltaY) || Math.abs(e.deltaX) < 8) return;
    const now = Date.now();
    if (now - wheelLock.current < 280) return;
    wheelLock.current = now;
    go(active + Math.sign(e.deltaX));
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(active - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      go(active + 1);
    } else if (e.key === "Enter" && entries[active]) {
      setOpened(entries[active]);
    }
  };

  if (count === 0) {
    return (
      <p
        className={cn(
          "grid h-full place-items-center px-6 text-center font-sans text-sm",
          tone === "warm" ? "text-white" : "text-ink-300",
          className,
        )}
      >
        No moments logged yet.
      </p>
    );
  }

  const position = active - drag;

  return (
    <div className={cn("relative flex h-full w-full flex-col", className)}>
      <div
        ref={stage}
        role="region"
        aria-roledescription="carousel"
        aria-label="Log moments"
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
        onKeyDown={onKeyDown}
        onClickCapture={(e) => {
          if (justDragged.current) {
            e.stopPropagation();
            e.preventDefault();
          }
        }}
        className={cn(
          "relative min-h-0 flex-1 touch-pan-y select-none outline-none [perspective:1400px]",
          "focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-0",
          dragging ? "cursor-grabbing" : "cursor-grab",
        )}
      >
        {entries.map((entry, i) => {
          const d = i - position;
          const distance = Math.abs(d);
          if (distance > VISIBLE + 0.5) return null;
          return (
            <Card
              key={entry.id}
              entry={entry}
              d={d}
              front={i === active && !dragging}
              animate={!dragging}
              onSelect={() => (i === active ? setOpened(entry) : go(i))}
            />
          );
        })}

        <span className="pointer-events-none absolute top-3 right-4 z-[200] rounded-full bg-black/45 px-2.5 py-1 font-sans text-xs font-semibold text-white tabular-nums">
          {active + 1} / {count}
        </span>

        {count > 1 && (
          <>
            <Arrow side="left" disabled={active === 0} onClick={() => go(active - 1)} />
            <Arrow side="right" disabled={active === count - 1} onClick={() => go(active + 1)} />
          </>
        )}
        <span className="sr-only" aria-live="polite">
          Moment {active + 1} of {count}
        </span>
      </div>

      {opened && <MomentViewer entry={opened} onClose={() => setOpened(null)} />}
    </div>
  );
}

/**
 * One card, placed by its distance from the front: d = 0 is front and
 * centre; ±1 sits half behind it; further ones step back and turn away.
 */
function Card({
  entry,
  d,
  front,
  animate,
  onSelect,
}: {
  entry: LogEntry;
  d: number;
  front: boolean;
  animate: boolean;
  onSelect: () => void;
}) {
  const distance = Math.abs(d);
  const side = Math.sign(d);
  // Percent of the card's own width: the first neighbour tucks halfway
  // behind, each one after steps out a little less.
  const x = side * (distance <= 1 ? distance * 62 : 62 + (distance - 1) * 38);
  const scale = Math.max(0.6, 1 - distance * 0.15);
  const turn = -Math.max(-1, Math.min(1, d)) * 22;
  const chapter = getChapter(entry.chapterSlug);
  const [loaded, setLoaded] = useState(false);

  return (
    <button
      type="button"
      tabIndex={-1}
      onClick={onSelect}
      aria-label={front ? "Open this moment" : `Show day ${entry.dayNumber}`}
      className={cn(
        "absolute top-1/2 left-1/2 aspect-[3/4] h-[82%] overflow-hidden rounded-[22px] bg-ivory-200 text-left shadow-[0_18px_40px_-12px_rgba(0,0,0,0.45)] ring-1 ring-white/30",
        animate && "transition-[transform,opacity,filter] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
      )}
      style={{
        transform: `translate(-50%, -50%) translateX(${x}%) scale(${scale}) rotateY(${turn}deg)`,
        zIndex: 100 - Math.round(distance * 10),
        opacity: distance > 3 ? 0 : 1,
        filter: distance > 0.5 ? `brightness(${1 - Math.min(distance, 3) * 0.12})` : undefined,
      }}
    >
      {entry.photoUrl ? (
        <>
          {!loaded && <span className="absolute inset-0 shimmer bg-ivory-300" aria-hidden="true" />}
          <Photo
            src={entry.photoUrl}
            alt=""
            fill
            unoptimized
            sizes="320px"
            draggable={false}
            onLoad={() => setLoaded(true)}
            className={cn("pointer-events-none object-cover transition-opacity duration-300", loaded ? "opacity-100" : "opacity-0")}
          />
        </>
      ) : (
        <span className="absolute inset-0 bg-gradient-to-br from-primary-100 via-ivory-100 to-primary-50 p-5">
          <span className="line-clamp-[8] font-display text-lg leading-snug text-ink-700">{entry.body}</span>
        </span>
      )}

      {/* Photos get a dark fade so white words read; a words-only card is
          already light, so its date sits plainly in ink. */}
      <span
        className={cn(
          "absolute inset-x-0 bottom-0 flex flex-col gap-1 px-4 pb-4",
          entry.photoUrl && "bg-gradient-to-t from-black/75 via-black/35 to-transparent pt-12",
        )}
      >
        {entry.photoUrl && entry.body && (
          <span className="line-clamp-2 font-sans text-base leading-snug font-semibold text-white">{entry.body}</span>
        )}
        <span className={cn("font-sans text-xs font-medium", entry.photoUrl ? "text-white/80" : "text-ink-400")}>
          Day {entry.dayNumber} · {logDateLabel(entry.entryDate)}
          {chapter ? ` · ${chapter.name}` : ""}
        </span>
      </span>
    </button>
  );
}

function Arrow({ side, disabled, onClick }: { side: "left" | "right"; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={side === "left" ? "Previous moment" : "Next moment"}
      onPointerDown={(e) => e.stopPropagation()}
      className={cn(
        "absolute top-1/2 z-[200] grid size-10 -translate-y-1/2 place-items-center rounded-full border border-white/40 text-ink-700 backdrop-blur-[20px] transition-opacity disabled:pointer-events-none disabled:opacity-0",
        side === "left" ? "left-3 lg:left-6" : "right-3 lg:right-6",
      )}
      style={{ backgroundImage: "linear-gradient(135deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.3) 100%)" }}
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

/** The front card, opened: the whole photo and every word of the moment. */
export function MomentViewer({ entry, onClose }: { entry: LogEntry; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  const chapter = getChapter(entry.chapterSlug);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Day ${entry.dayNumber}`}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-[520px] flex-col overflow-hidden rounded-3xl bg-surface"
      >
        {entry.photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- a signed link at its natural size
          <img src={entry.photoUrl} alt="" className="max-h-[60vh] w-full bg-black object-contain" />
        )}
        <div className="flex flex-col gap-2 overflow-y-auto p-5">
          <span className="font-sans text-xs font-medium text-ink-400">
            Day {entry.dayNumber} · {logDateLabel(entry.entryDate)}
            {chapter ? ` · ${chapter.name}` : ""}
          </span>
          {entry.body && <p className="font-sans text-base whitespace-pre-line text-ink-700">{entry.body}</p>}
          <button
            type="button"
            onClick={onClose}
            className="mt-2 self-end rounded-full px-4 py-2 font-ui text-sm font-medium text-primary-600 hover:bg-primary-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
