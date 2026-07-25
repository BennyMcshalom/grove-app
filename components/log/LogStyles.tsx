'use client';
import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import type { LogEntry } from './types';

// ── shared carousel state ──
export function useCarousel(n: number): [number, (d: number) => void, (i: number) => void] {
  const [i, setI] = useState(Math.max(0, n - 1));
  const go = (d: number) => setI(p => Math.max(0, Math.min(n - 1, p + d)));
  return [Math.max(0, Math.min(n - 1, i)), go, setI];
}

// ── Style A — Player (3D coverflow) ──
export function StyleA({ entries, onOpen }: { entries: LogEntry[]; onOpen: (i: number) => void }) {
  const [i, go, setI] = useCarousel(entries.length);
  if (!entries.length) return null;
  const cur = entries[Math.min(i, entries.length - 1)] || entries[0];
  return (
    <div style={{ borderRadius: 26, padding: '1.9rem 1.2rem 1.6rem', background: 'linear-gradient(165deg, #F6C078, #E08A3C 60%, #B5611E)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.3)' }}>
      <div style={{ position: 'relative', height: 340, perspective: 1200 }}>
        {entries.map((e, idx) => {
          const off = idx - i;
          if (Math.abs(off) > 2) return null;
          const isC = off === 0;
          return (
            <button key={idx} onClick={() => isC ? onOpen(idx) : setI(idx)} style={{
              position: 'absolute', left: '50%', top: '50%', width: 220, height: 288,
              transform: `translate(-50%,-50%) translateX(${off * 82}px) rotateY(${off * -22}deg) scale(${isC ? 1 : 0.84})`,
              zIndex: 10 - Math.abs(off), transition: 'transform .4s cubic-bezier(.22,.61,.36,1)',
              borderRadius: 20, overflow: 'hidden', transformStyle: 'preserve-3d',
              boxShadow: isC ? '0 30px 56px -16px rgba(60,30,8,.6)' : '0 14px 28px -12px rgba(60,30,8,.5)',
              filter: isC ? 'none' : 'blur(1.5px) brightness(.92)', cursor: 'pointer'
            }}>
              {e.media
                ? <img src={e.media} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={{ width: '100%', height: '100%', background: 'var(--surf-high)' }} />}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(20,12,4,.05) 40%, rgba(20,12,4,.82))' }} />
              {isC && (
                <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '1.2rem' }}>
                  <div className="mono" style={{ color: 'rgba(255,255,255,.75)', fontSize: '.7rem', marginBottom: '.35rem' }}>DAY {e.day} · {e.date}</div>
                  <div className="serif" style={{ color: '#fff', fontSize: '1.28rem', fontWeight: 600, lineHeight: 1.25 }}>
                    {(e.text ?? '').length > 58 ? e.text!.slice(0, 58) + '…' : e.text}
                  </div>
                </div>
              )}
              <div style={{ position: 'absolute', inset: 0, borderRadius: 20, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.25)' }} />
            </button>
          );
        })}
      </div>
      <div style={{
        marginTop: '1.2rem', display: 'flex', alignItems: 'center', gap: '.9rem', background: 'rgba(255,255,255,.22)',
        backdropFilter: 'blur(8px)', borderRadius: 18, padding: '.85rem 1.1rem', border: '1px solid rgba(255,255,255,.35)'
      }}>
        <button onClick={() => go(-1)} disabled={i === 0} style={{ opacity: i === 0 ? .4 : 1, color: '#fff' }}><Icon name="back" size={24} stroke="#fff" /></button>
        <div style={{ flex: 1, minWidth: 0, textAlign: 'center', color: '#fff' }}>
          <div style={{ fontWeight: 600, fontSize: '.94rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{(cur.text ?? '').slice(0, 34)}</div>
          <div style={{ fontSize: '.76rem', opacity: .8 }}>Day {cur.day} of your chapter</div>
        </div>
        <button onClick={() => go(1)} disabled={i === entries.length - 1} style={{ opacity: i === entries.length - 1 ? .4 : 1, transform: 'scaleX(-1)', color: '#fff' }}><Icon name="back" size={24} stroke="#fff" /></button>
        <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="#B5611E"><path d="M9 18V5l11-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="20" cy="16" r="3" /></svg>
        </div>
      </div>
    </div>
  );
}
