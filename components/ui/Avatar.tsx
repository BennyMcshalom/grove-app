'use client';
import Image from 'next/image';
import clsx from 'clsx';
import { useState } from 'react';
import { AVATAR_MAP, avatarFor, PHASE } from '@/lib/data';
import { AuraRing } from './AuraRing';
import type { AuraKey, TimePhase } from '@/lib/types';
import styles from './Avatar.module.css';

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
  const [imgError, setImgError] = useState(false);
  const [lastAvatarUrl, setLastAvatarUrl] = useState(avatarUrl);
  if (avatarUrl !== lastAvatarUrl) {
    setLastAvatarUrl(avatarUrl);
    setImgError(false);
  }
  const sizeVar = { '--size': `${size}px` } as React.CSSProperties;
  const ringShadow = ring
    ? `0 0 0 2.5px var(--white), 0 0 0 ${2.5 + ring}px ${ring === 3 ? 'var(--ember)' : 'var(--border-2)'}`
    : 'none';

  const phaseCfg = timePhase ? PHASE[timePhase] : null;
  const auraEl = aura ? <AuraRing aura={aura} size={size} /> : null;

  if (anon) {
    return (
      <div className={styles.wrap} style={{ ...sizeVar, ...style }}>
        {auraEl}
        <div
          className={styles.anonCircle}
          style={{ boxShadow: ring ? `0 0 0 2px var(--white), 0 0 0 ${ring}px ${ring === 3 ? 'var(--ember)' : 'var(--border-2)'}` : undefined }}
        >
          <span className={styles.emoji}>🫥</span>
        </div>
      </div>
    );
  }

  // avatarUrl is a remote URL (R2) — use plain <img> to avoid Next.js domain restrictions.
  // AVATAR_MAP entries are local /public paths — use <Image> for optimisation.
  const staticImg = AVATAR_MAP[name];
  const { grad, initials } = avatarFor(name);

  if (avatarUrl && !imgError) {
    return (
      <div className={styles.wrap} style={{ ...sizeVar, ...style }}>
        {auraEl}
        <div className={styles.circle} style={{ boxShadow: ringShadow }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={avatarUrl}
            alt={name}
            width={size}
            height={size}
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : 'auto'}
            className={styles.img}
            onError={() => setImgError(true)}
          />
          {phaseCfg && <div className={styles.phaseOverlay} style={{ background: phaseCfg.overlay }} />}
        </div>
        {dot && <span className={clsx(styles.dot, styles.stacked)} />}
      </div>
    );
  }

  if (staticImg) {
    return (
      <div className={styles.wrap} style={{ ...sizeVar, ...style }}>
        {auraEl}
        <div className={styles.circle} style={{ boxShadow: ringShadow }}>
          <Image src={staticImg} alt={name} width={size} height={size} priority={priority}
            style={{ objectFit: 'cover', objectPosition: '50% 38%', display: 'block' }} />
          {phaseCfg && <div className={styles.phaseOverlay} style={{ background: phaseCfg.overlay }} />}
        </div>
        {dot && <span className={clsx(styles.dot, styles.stacked)} />}
      </div>
    );
  }

  return (
    <div className={styles.wrap} style={{ ...sizeVar, ...style }}>
      {auraEl}
      <div className={styles.initialsCircle} style={{ background: `linear-gradient(135deg, ${grad[0]}, ${grad[1]})`, boxShadow: ringShadow }}>
        {initials}
      </div>
      {dot && <span className={styles.dot} />}
    </div>
  );
}
