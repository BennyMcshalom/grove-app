'use client';
import { useState, useRef } from 'react';
import styles from './VoicePlayer.module.css';

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
    else { audioRef.current.play().catch(() => { }); setPlaying(true); }
  };

  const total = dur ?? 0;
  const progress = total > 0 ? Math.min(elapsed / total, 1) : 0;
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const bg = sent ? 'var(--ember)' : 'var(--white)';
  const barC = sent ? 'rgba(255,255,255,0.75)' : 'var(--border-2)';
  const barP = sent ? '#fff' : 'var(--ember)';
  const txtC = sent ? 'rgba(255,255,255,0.75)' : 'var(--ink-3)';

  return (
    <div className={styles.wrap} style={{
      background: bg,
      boxShadow: sent ? '0 2px 10px -3px rgba(243,112,30,.4)' : 'var(--shadow-soft)',
      borderBottomRightRadius: sent ? 6 : 22, borderBottomLeftRadius: sent ? 22 : 6
    }}>
      {/* Play / Pause */}
      <button onClick={toggle} className={styles.playBtn} style={{ background: sent ? 'rgba(255,255,255,0.22)' : 'var(--ember)' }}>
        {playing
          ? <svg width="13" height="13" viewBox="0 0 24 24" fill="#fff"><rect x="5" y="4" width="5" height="16" rx="1.5" /><rect x="14" y="4" width="5" height="16" rx="1.5" /></svg>
          : <svg width="13" height="13" viewBox="0 0 24 24" fill="#fff" className={styles.playIconOffset}><path d="M6 4l14 8-14 8V4z" /></svg>}
      </button>

      {/* Waveform */}
      <div className={styles.waveform}>
        {bars.current.map((h, i) => {
          const isFilled = progress > 0 && i / barCount <= progress;
          return (
            <div key={i} className={styles.bar} style={{
              height: `${Math.max(4, h * 27)}px`,
              background: isFilled ? barP : barC,
              opacity: playing ? 1 : 0.7,
              animation: playing && Math.abs(i / barCount - progress) < 0.15
                ? `wave ${0.5 + (i % 4) * 0.1}s ease-in-out infinite` : 'none',
            }} />
          );
        })}
      </div>

      {/* Duration */}
      <span className={styles.durationText} style={{ color: txtC }}>
        {playing ? fmt(elapsed) : fmt(total)}
      </span>
    </div>
  );
}
