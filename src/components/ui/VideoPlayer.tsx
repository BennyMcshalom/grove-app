'use client';
import { useRef, useState } from 'react';

function fmt(s: number) {
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

export function VideoPlayer({ src, maxHeight = 360 }: { src: string; maxHeight?: number }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hideRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [playing,  setPlaying]  = useState(false);
  const [time,     setTime]     = useState(0);
  const [dur,      setDur]      = useState(0);
  const [visible,  setVisible]  = useState(true); // controls visibility

  const arm = () => {
    setVisible(true);
    if (hideRef.current) clearTimeout(hideRef.current);
    if (videoRef.current && !videoRef.current.paused) {
      hideRef.current = setTimeout(() => setVisible(false), 3000);
    }
  };

  const doPlay = async () => {
    try { await videoRef.current?.play(); setPlaying(true); arm(); } catch {}
  };
  const doPause = () => {
    videoRef.current?.pause();
    setPlaying(false);
    setVisible(true);
    if (hideRef.current) clearTimeout(hideRef.current);
  };
  const toggle = () => (playing ? doPause() : doPlay());

  const seekTo = (t: number) => {
    if (videoRef.current) videoRef.current.currentTime = t;
    setTime(t);
  };

  const forward = (e: React.MouseEvent) => {
    e.stopPropagation();
    seekTo(Math.min(time + 10, dur));
    arm();
  };

  const showCtrls = !playing || visible;

  return (
    <div
      style={{ position: 'relative', background: '#000', borderRadius: 12, overflow: 'hidden', cursor: 'pointer' }}
      onClick={toggle}
      onMouseMove={arm}
    >
      <video
        ref={videoRef}
        src={src}
        playsInline
        preload="metadata"
        onLoadedMetadata={() => {
          const v = videoRef.current;
          if (!v) return;
          setDur(v.duration);
          // Seek to a small offset so the first frame renders as the thumbnail
          v.currentTime = 0.01;
        }}
        onTimeUpdate={() => {
          if (videoRef.current) setTime(videoRef.current.currentTime);
        }}
        onEnded={() => {
          setPlaying(false);
          setVisible(true);
          if (videoRef.current) videoRef.current.currentTime = 0;
          setTime(0);
        }}
        style={{ width: '100%', display: 'block', maxHeight }}
      />

      {/* Gradient overlay + controls */}
      <div
        style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
          background: showCtrls
            ? 'linear-gradient(to bottom, transparent 35%, rgba(0,0,0,.72) 100%)'
            : 'transparent',
          opacity: showCtrls ? 1 : 0,
          transition: 'opacity .3s',
          pointerEvents: 'none',
        }}
      >
        {/* Center play button — only when paused */}
        {!playing && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex',
            alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <div style={{ width: 60, height: 60, borderRadius: '50%',
              background: 'rgba(255,255,255,.92)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(0,0,0,.35)' }}>
              <svg width="20" height="22" viewBox="0 0 20 22" fill="#111">
                <path d="M1 1l18 10L1 21V1z"/>
              </svg>
            </div>
          </div>
        )}

        {/* Bottom controls */}
        <div style={{ padding: '0 .9rem .75rem', pointerEvents: 'auto' }}
          onClick={e => e.stopPropagation()}>

          {/* Seek bar */}
          <input
            type="range" min={0} max={dur || 100} step={0.1} value={time}
            onChange={e => { seekTo(Number(e.target.value)); arm(); }}
            style={{ width: '100%', display: 'block', cursor: 'pointer',
              accentColor: '#F3701E', height: 4, marginBottom: '.5rem' }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: '.55rem' }}>

            {/* Play / Pause */}
            <button
              onClick={e => { e.stopPropagation(); toggle(); }}
              style={{ width: 30, height: 30, display: 'flex', alignItems: 'center',
                justifyContent: 'center', flexShrink: 0 }}>
              {playing
                ? <svg width="12" height="14" viewBox="0 0 12 14" fill="#fff">
                    <rect x="0" y="0" width="4.5" height="14" rx=".8"/>
                    <rect x="7.5" y="0" width="4.5" height="14" rx=".8"/>
                  </svg>
                : <svg width="12" height="14" viewBox="0 0 12 14" fill="#fff" style={{ marginLeft: 1 }}>
                    <path d="M0 0l12 7L0 14V0z"/>
                  </svg>}
            </button>

            {/* Time */}
            <span style={{ fontSize: '.7rem', color: 'rgba(255,255,255,.88)',
              fontFamily: 'DM Mono, monospace', flexShrink: 0, letterSpacing: '.02em' }}>
              {fmt(time)} / {fmt(dur)}
            </span>

            <div style={{ flex: 1 }}/>

            {/* Skip forward +10s */}
            <button
              onClick={forward}
              style={{ display: 'flex', alignItems: 'center', gap: 4,
                fontSize: '.72rem', fontWeight: 700, color: '#fff',
                background: 'rgba(255,255,255,.18)', borderRadius: 6,
                padding: '.28rem .55rem', flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5,4 15,12 5,20" fill="white" stroke="none"/>
                <line x1="19" y1="4" x2="19" y2="20"/>
              </svg>
              +10s
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
