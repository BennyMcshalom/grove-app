'use client';
import { useState, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────
// VOICE PLAYER — waveform bars + real audio playback
// ─────────────────────────────────────────────────────────────────
export function VoicePlayer({ url, dur, sent }: {
  url: string; dur?: number | null; sent: boolean;
  myReaction?: string; onReact?: (e: string) => void;
}) {
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const barCount = 28;
  const bars = useRef(Array.from({ length: barCount }, () => 0.2 + Math.random() * 0.8));

  const toggle = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(url);
      audioRef.current.onended = () => { setPlaying(false); setElapsed(0); };
      audioRef.current.ontimeupdate = () => setElapsed(Math.floor(audioRef.current!.currentTime));
    }
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play().catch(() => {}); setPlaying(true); }
  };

  const total = dur ?? 0;
  const progress = total > 0 ? Math.min(elapsed / total, 1) : 0;
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const bg   = sent ? 'var(--ember)' : 'var(--surf-high)';
  const barC = sent ? 'rgba(255,255,255,0.8)' : 'var(--slate)';
  const barP = sent ? '#fff' : 'var(--ember)';
  const txtC = sent ? 'rgba(255,255,255,0.7)' : 'var(--ink-3)';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '.65rem', padding: '.7rem .85rem',
      borderRadius: 20, background: bg, minWidth: 200, maxWidth: 260,
      borderBottomRightRadius: sent ? 4 : 20, borderBottomLeftRadius: sent ? 20 : 4 }}>
      {/* Play / Pause */}
      <button onClick={toggle} style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
        background: sent ? 'rgba(255,255,255,0.2)' : 'var(--ember)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}>
        {playing
          ? <svg width="12" height="12" viewBox="0 0 24 24" fill={sent ? '#fff' : '#fff'}><rect x="5" y="4" width="5" height="16" rx="1"/><rect x="14" y="4" width="5" height="16" rx="1"/></svg>
          : <svg width="12" height="12" viewBox="0 0 24 24" fill={sent ? '#fff' : '#fff'} style={{ marginLeft: 2 }}><path d="M6 4l14 8-14 8V4z"/></svg>}
      </button>

      {/* Waveform */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 2, height: 28 }}>
        {bars.current.map((h, i) => {
          const isFilled = progress > 0 && i / barCount <= progress;
          return (
            <div key={i} style={{
              width: 3, borderRadius: 2, flexShrink: 0,
              height: `${Math.max(4, h * 24)}px`,
              background: isFilled ? barP : barC,
              opacity: playing ? 1 : 0.6,
              transition: 'height .1s ease',
              animation: playing && Math.abs(i / barCount - progress) < 0.15
                ? `wave ${0.5 + (i % 4) * 0.1}s ease-in-out infinite` : 'none',
            }}/>
          );
        })}
      </div>

      {/* Duration */}
      <span style={{ fontSize: '.68rem', color: txtC, fontFamily: 'DM Mono, monospace', flexShrink: 0 }}>
        {playing ? fmt(elapsed) : fmt(total)}
      </span>
    </div>
  );
}
