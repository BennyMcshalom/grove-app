import Image from 'next/image';
import { AVATAR_MAP, avatarFor, PHASE } from '@/lib/data';
import { AuraRing } from './AuraRing';
import type { AuraKey, TimePhase } from '@/lib/types';

interface AvatarProps {
  name?: string;
  size?: number;
  ring?: number;
  dot?: boolean;
  anon?: boolean;
  aura?: AuraKey;
  timePhase?: TimePhase;
  style?: React.CSSProperties;
  avatarUrl?: string | null;
  /** Skip lazy-loading — use for above-the-fold hero images (e.g. onboarding scenes). */
  priority?: boolean;
}

export function Avatar({ name = '', size = 44, ring, dot, anon, aura, timePhase, style, avatarUrl, priority }: AvatarProps) {
  const ringShadow = ring
    ? `0 0 0 2.5px var(--white), 0 0 0 ${2.5 + ring}px ${ring === 3 ? 'var(--ember)' : 'var(--border-2)'}`
    : 'none';

  const phaseCfg = timePhase ? PHASE[timePhase] : null;
  const auraEl = aura ? <AuraRing aura={aura} size={size} /> : null;

  if (anon) {
    return (
      <div style={{ position: 'relative', width: size, height: size, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', ...style }}>
        {auraEl}
        <div style={{ width: size, height: size, borderRadius: '50%', background: 'var(--surf-high)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--ink-4)', fontSize: size * 0.5,
          boxShadow: ring ? `0 0 0 2px var(--white), 0 0 0 ${ring}px ${ring === 3 ? 'var(--ember)' : 'var(--border-2)'}` : undefined }}>
          <span style={{ filter: 'grayscale(1)', opacity: .7 }}>🫥</span>
        </div>
      </div>
    );
  }

  // avatarUrl is a remote URL (R2) — use plain <img> to avoid Next.js domain restrictions.
  // AVATAR_MAP entries are local /public paths — use <Image> for optimisation.
  const staticImg = AVATAR_MAP[name];
  const { grad, initials } = avatarFor(name);

  if (avatarUrl) {
    return (
      <div style={{ position: 'relative', flexShrink: 0, width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', ...style }}>
        {auraEl}
        <div style={{ position: 'relative', width: size, height: size, borderRadius: '50%', overflow: 'hidden', boxShadow: ringShadow }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={avatarUrl} alt={name} width={size} height={size}
            loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : 'auto'}
            style={{ objectFit: 'cover', objectPosition: '50% 38%', display: 'block', width: size, height: size }}/>
          {phaseCfg && (
            <div style={{ position: 'absolute', inset: 0, background: phaseCfg.overlay, mixBlendMode: 'soft-light', pointerEvents: 'none' }}/>
          )}
        </div>
        {dot && <span style={{ position: 'absolute', right: 1, bottom: 1,
          width: size * 0.26, height: size * 0.26, minWidth: 9, minHeight: 9,
          borderRadius: '50%', background: 'var(--sage)', border: '2px solid var(--white)', zIndex: 2 }}/>}
      </div>
    );
  }

  if (staticImg) {
    return (
      <div style={{ position: 'relative', flexShrink: 0, width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', ...style }}>
        {auraEl}
        <div style={{ position: 'relative', width: size, height: size, borderRadius: '50%', overflow: 'hidden', boxShadow: ringShadow }}>
          <Image src={staticImg} alt={name} width={size} height={size} priority={priority}
            style={{ objectFit: 'cover', objectPosition: '50% 38%', display: 'block' }}/>
          {phaseCfg && (
            <div style={{ position: 'absolute', inset: 0, background: phaseCfg.overlay, mixBlendMode: 'soft-light', pointerEvents: 'none' }}/>
          )}
        </div>
        {dot && <span style={{ position: 'absolute', right: 1, bottom: 1,
          width: size * 0.26, height: size * 0.26, minWidth: 9, minHeight: 9,
          borderRadius: '50%', background: 'var(--sage)', border: '2px solid var(--white)', zIndex: 2 }}/>}
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', flexShrink: 0, width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', ...style }}>
      {auraEl}
      <div style={{ width: size, height: size, borderRadius: '50%',
        background: `linear-gradient(135deg, ${grad[0]}, ${grad[1]})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontWeight: 600, fontSize: size * 0.36, letterSpacing: '.01em',
        boxShadow: ringShadow }}>
        {initials}
      </div>
      {dot && <span style={{ position: 'absolute', right: 1, bottom: 1,
        width: size * 0.26, height: size * 0.26, minWidth: 9, minHeight: 9,
        borderRadius: '50%', background: 'var(--sage)', border: '2px solid var(--white)' }}/>}
    </div>
  );
}
