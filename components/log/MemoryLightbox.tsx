'use client';
import { useState, useEffect, useRef } from 'react';
import { Icon } from '@/components/ui/Icon';
import type { Space } from '@/lib/types';
import type { LogEntry } from './types';

// ── Memory lightbox — open one entry full, prev/next through the log ──
export function MemoryLightbox({ entries, startIndex = 0, space, onClose }: {
  entries: LogEntry[]; startIndex?: number; space: Space; onClose: () => void;
}) {
  const [idx, setIdx] = useState(Math.max(0, Math.min(startIndex, entries.length - 1)));
  const touchX = useRef<number | null>(null);
  const entry = entries[idx];
  const canPrev = idx > 0;
  const canNext = idx < entries.length - 1;
  const prev = () => canPrev && setIdx(i => i - 1);
  const next = () => canNext && setIdx(i => i + 1);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, entries.length]);

  if (!entry) return null;

  const onTouchStart = (e: React.TouchEvent) => { touchX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 50) { if (dx < 0) next(); else prev(); }
    touchX.current = null;
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 7200, background: 'rgba(20,14,8,.62)', backdropFilter: 'blur(5px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem'
    }} onClick={onClose}>
      {canPrev && (
        <button onClick={e => { e.stopPropagation(); prev(); }}
          style={{
            position: 'absolute', left: 'max(1rem, calc(50% - 260px))', top: '50%', transform: 'translateY(-50%)',
            width: 46, height: 46, borderRadius: '50%', background: 'rgba(255,255,255,.16)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2
          }}>
          <Icon name="back" size={20} stroke="#fff" />
        </button>
      )}
      {canNext && (
        <button onClick={e => { e.stopPropagation(); next(); }}
          style={{
            position: 'absolute', right: 'max(1rem, calc(50% - 260px))', top: '50%', transform: 'translateY(-50%) scaleX(-1)',
            width: 46, height: 46, borderRadius: '50%', background: 'rgba(255,255,255,.16)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2
          }}>
          <Icon name="back" size={20} stroke="#fff" />
        </button>
      )}
      <div className="swap-in" key={idx} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
        style={{ width: 'min(400px, 94vw)', background: 'var(--cream)', borderRadius: 26, overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ position: 'relative', height: 320 }}>
          {entry.media
            ? <img src={entry.media} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ width: '100%', height: '100%', background: 'var(--surf-high)' }} />}
          <button onClick={onClose} style={{
            position: 'absolute', top: 12, right: 12, width: 34, height: 34, borderRadius: '50%',
            background: 'rgba(20,14,8,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Icon name="close" size={17} stroke="#fff" />
          </button>
          <div style={{ position: 'absolute', left: 14, bottom: 12, display: 'flex', alignItems: 'center', gap: '.5rem' }}>
            <span style={{
              width: 30, height: 30, borderRadius: 9, background: 'rgba(255,255,255,.92)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Icon name={space.icon} size={15} stroke={space.ink} />
            </span>
            <span className="mono" style={{ color: '#fff', fontSize: '.7rem', textShadow: '0 1px 4px rgba(0,0,0,.5)' }}>Day {entry.day} · {entry.date}</span>
          </div>
          {entries.length > 1 && (
            <span className="mono" style={{ position: 'absolute', right: 14, bottom: 12, color: '#fff', fontSize: '.68rem', textShadow: '0 1px 4px rgba(0,0,0,.5)' }}>
              {idx + 1} / {entries.length}
            </span>
          )}
        </div>
        <div style={{ padding: '1.4rem 1.5rem 1.6rem' }}>
          <p className="serif" style={{ fontSize: '1.5rem', fontWeight: 600, lineHeight: 1.35 }}>{entry.text}</p>
          {entries.length > 1 && (
            <div style={{ display: 'flex', gap: 5, marginTop: '1.1rem', justifyContent: 'center' }}>
              {entries.map((_, i) => (
                <span key={i} style={{
                  width: i === idx ? 16 : 6, height: 6, borderRadius: 100,
                  background: i === idx ? 'var(--ember)' : 'var(--border-2)', transition: 'all .2s', display: 'block'
                }} />
              ))}
            </div>
          )}
          <div style={{ textAlign: 'center', marginTop: '.9rem', fontSize: '.72rem', color: 'var(--ink-4)' }}>← → keys or swipe to move between moments</div>
        </div>
      </div>
    </div>
  );
}
