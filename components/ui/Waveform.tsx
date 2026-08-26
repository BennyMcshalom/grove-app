"use client";
import { useMemo } from "react";

interface WaveformProps {
  color?: string;
  bars?: number;
  playing?: boolean;
  height?: number;
}

function seededRandom(seed: number): number {
  let t = (seed + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
}

export function Waveform({
  color = "var(--ember)",
  bars = 28,
  playing,
  height = 26,
}: WaveformProps) {
  const seed = useMemo(
    () => [...Array(bars)].map((_, i) => 0.25 + seededRandom(i) * 0.75),
    [bars],
  );
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2, height }}>
      {seed.map((h, i) => (
        <div
          key={i}
          style={{
            width: 3,
            borderRadius: 3,
            background: color,
            height: `${h * 100}%`,
            opacity: playing ? 1 : 0.5,
            animation: playing
              ? `wave ${0.6 + (i % 5) * 0.12}s ease-in-out ${i * 0.03}s infinite`
              : "none",
          }}
        />
      ))}
    </div>
  );
}
