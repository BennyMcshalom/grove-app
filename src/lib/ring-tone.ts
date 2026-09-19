"use client";

import { useEffect } from "react";

type RingKind = "incoming" | "outgoing";

interface Beep {
  /** Seconds after the start of the pattern. */
  at: number;
  hz: number;
  length: number;
}

interface Pattern {
  beeps: Beep[];
  /** Milliseconds between repeats. */
  every: number;
  volume: number;
}

const PATTERNS: Record<RingKind, Pattern> = {
  // The callee's ring: a bright two-tone chirp that asks to be answered.
  incoming: {
    beeps: [
      { at: 0, hz: 660, length: 0.22 },
      { at: 0.25, hz: 880, length: 0.22 },
    ],
    every: 2000,
    volume: 0.08,
  },
  // The caller's ringback: one low, longer tone with a wide gap. It only has
  // to say "it is ringing at the other end", so it stays quieter.
  outgoing: {
    beeps: [{ at: 0, hz: 420, length: 0.9 }],
    every: 3000,
    volume: 0.045,
  },
};

/**
 * Rings until the returned function is called.
 *
 * Browsers refuse to start audio on a page nobody has touched yet. When that
 * happens the context stays suspended, so we also resume on the first click or
 * key press — a call that arrives while the tab is idle then starts sounding
 * as soon as the person touches anything.
 */
export function startRinging(kind: RingKind): () => void {
  const pattern = PATTERNS[kind];
  let context: AudioContext | null = null;
  let stopped = false;

  try {
    context = new AudioContext();
  } catch {
    return () => {};
  }

  const ring = () => {
    if (!context || context.state !== "running") return;
    for (const beep of pattern.beeps) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const start = context.currentTime + beep.at;
      oscillator.frequency.value = beep.hz;
      // Ramped rather than switched on, so it doesn't click.
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(pattern.volume, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + beep.length);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + beep.length + 0.02);
    }
  };

  const wake = () => {
    if (stopped || !context) return;
    void context.resume().then(ring).catch(() => {});
  };

  wake();
  const timer = setInterval(ring, pattern.every);
  for (const event of ["pointerdown", "keydown", "touchstart"] as const) {
    window.addEventListener(event, wake, { once: true, passive: true });
  }

  return () => {
    stopped = true;
    clearInterval(timer);
    for (const event of ["pointerdown", "keydown", "touchstart"] as const) {
      window.removeEventListener(event, wake);
    }
    void context?.close().catch(() => {});
    context = null;
  };
}

/** Rings for as long as `active` is true. */
export function useRingTone(active: boolean, kind: RingKind) {
  useEffect(() => {
    if (!active) return;
    return startRinging(kind);
  }, [active, kind]);
}
