'use client';
import { useRef } from 'react';

interface WaveformProps { color?: string; bars?: number; playing?: boolean; height?: number; }

export function Waveform({ color = 'var(--ember)', bars = 28, playing, height = 26 }: WaveformProps) {
  const seed = useRef([...Array(bars)].map(() => 0.25 + Math.random() * 0.75));
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2, height }}>
      {seed.current.map((h, i) => (
        <div key={i} style={{ width: 3, borderRadius: 3, background: color,
          height: `${h * 100}%`, opacity: playing ? 1 : .5,
          animation: playing ? `wave ${0.6 + (i % 5) * 0.12}s ease-in-out ${i * 0.03}s infinite` : 'none' }}/>
      ))}
    </div>
  );
}
