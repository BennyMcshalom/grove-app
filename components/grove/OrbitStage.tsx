'use client';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { Waveform } from '@/components/ui/Waveform';
import { spaceById } from '@/lib/data';
import type { AuraKey, TimePhase } from '@/lib/types';
import type { Ring } from './rings';

export function OrbitStage({ stage, rings, active, hover, onSelectRing, onHover, uniqueSpaceIds,
  name, avatarSize, phase, realAura, avatarUrl, ambience, setAmbience, possessiveCap }: {
  stage: number;
  rings: Ring[];
  active: string | null; hover: string | null;
  onSelectRing: (key: string | null) => void; onHover: (key: string | null) => void;
  uniqueSpaceIds: string[];
  name: string; avatarSize: number; phase: TimePhase; realAura: AuraKey | undefined; avatarUrl: string | null;
  ambience: boolean; setAmbience: (v: boolean) => void;
  possessiveCap: string;
}) {
  return (
    <div className="grove-orbit-stage" style={{ position: 'relative', width: stage, maxWidth: '92vw', aspectRatio: '1' }}>
      {[...rings].reverse().map(ring => {
        const dPct = ring.r * 100;
        const on = active === ring.key;
        const hov = hover === ring.key;
        return (
          <div key={ring.key} onClick={() => onSelectRing(on ? null : ring.key)}
            onMouseEnter={() => onHover(ring.key)} onMouseLeave={() => onHover(null)}
            style={{
              position: 'absolute', left: '50%', top: '50%', width: `${dPct}%`, height: `${dPct}%`, transform: 'translate(-50%,-50%)',
              borderRadius: '50%', border: `2px solid ${ring.color}`, opacity: on || hov ? 1 : .5, cursor: 'pointer',
              boxShadow: on ? `0 0 26px -2px ${ring.color}99, inset 0 0 26px -6px ${ring.color}66` : 'none',
              background: hov && !on ? `radial-gradient(circle, transparent 60%, ${ring.color}14)` : 'transparent',
              transition: 'opacity .25s, box-shadow .25s, background .2s'
            }}>
            <div style={{
              position: 'absolute', left: '50%', top: -6, transform: 'translate(-50%,-100%)',
              background: 'var(--white)', borderRadius: 100, padding: '.25rem .7rem', boxShadow: 'var(--shadow-soft)',
              fontSize: '.66rem', fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase' as const, color: ring.color, whiteSpace: 'nowrap' as const
            }}>
              {ring.label}
            </div>
          </div>
        );
      })}

      {/* Orbiting spaces — positioned with %-based coordinates (also fixes the
          same fixed-pixel-vs-responsive-container mismatch as the rings above) */}
      <div style={{ position: 'absolute', inset: 0, animation: 'orbit 48s linear infinite', pointerEvents: 'none' }}>
        {uniqueSpaceIds.map((id, i) => {
          // Offset by half a segment so icons land between the cardinal points
          // instead of at top/bottom-center, where the ring labels and the
          // ambience indicator already sit.
          const ang = (i / uniqueSpaceIds.length) * Math.PI * 2 - Math.PI / 2 + Math.PI / uniqueSpaceIds.length;
          // The outer ring's r (0.70) is its diameter as a fraction of the
          // container — i.e. the ring itself is rendered at width/height:70%.
          // Orbit radius is half that. Using 70 directly here (instead of 35)
          // put icons at 50±70% — up to 120%, well outside the container —
          // which scattered them across the page instead of on the ring.
          const rrPct = (rings.find(r => r.key === 'outer')!.r * 100) / 2;
          const xPct = 50 + Math.cos(ang) * rrPct, yPct = 50 + Math.sin(ang) * rrPct;
          const s = spaceById(id);
          return (
            <div key={id} style={{ position: 'absolute', left: `${xPct}%`, top: `${yPct}%`, transform: 'translate(-50%,-50%)', animation: 'orbitR 48s linear infinite' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow)', animation: 'groveFloat 4s ease-in-out infinite' }}>
                <Icon name={s.icon} size={20} stroke={s.ink} sw={1.6} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Center portrait */}
      <button onMouseDown={() => setAmbience(true)} onMouseUp={() => setAmbience(false)} onMouseLeave={() => setAmbience(false)}
        style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', borderRadius: '50%', zIndex: 6 }}>
        <Avatar name={name || '?'} size={avatarSize} timePhase={phase} aura={realAura} ring={2} avatarUrl={avatarUrl} />
      </button>

      {ambience && (
        <div style={{
          position: 'absolute', left: '50%', bottom: 8, transform: 'translateX(-50%)', zIndex: 7,
          display: 'flex', alignItems: 'center', gap: '.5rem', background: 'var(--white)', borderRadius: 100, padding: '.4rem .8rem', boxShadow: 'var(--shadow)'
        }}>
          <div style={{ width: 54 }}><Waveform color="var(--sage)" playing bars={14} height={18} /></div>
          <span style={{ fontSize: '.72rem', color: 'var(--ink-2)' }}>{possessiveCap} ambience</span>
        </div>
      )}
    </div>
  );
}
