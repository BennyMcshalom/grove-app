'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar } from '@/components/ui/Avatar';
import { SpaceIcon } from '@/components/ui/SpaceIcon';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import type { NearbyUser } from '@/lib/api';

// ── Person card ────────────────────────────────────────────────────
export function NearbyCard({ person, mySpaces, onWave }: {
  person: NearbyUser;
  mySpaces: string[];
  onWave: (id: string) => Promise<void>;
}) {
  const router = useRouter();
  const [waveState, setWaveState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const sharedSpaces = [...new Set(person.spaces)].filter(s => mySpaces.includes(s));
  const hasShared = sharedSpaces.length > 0;

  const handleWave = async () => {
    if (waveState !== 'idle') return;
    setWaveState('sending');
    try { await onWave(person.userId); setWaveState('sent'); }
    catch { setWaveState('idle'); }
  };

  return (
    <div className="card" style={{ padding: '1rem 1.1rem', marginBottom: '.65rem',
      boxShadow: 'var(--shadow-soft)',
      borderLeft: hasShared ? '3px solid var(--sage)' : '3px solid transparent' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '.85rem' }}>
        <button onClick={() => router.push(`/grove/${person.userId}`)}>
          <Avatar name={person.displayName} size={46} avatarUrl={person.avatarUrl} aura={person.aura ?? undefined}/>
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '.92rem' }}>{person.displayName}</div>
          {hasShared ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '.35rem', marginTop: '.2rem' }}>
              {sharedSpaces.slice(0, 3).map((s, i) => <SpaceIcon key={`${s}-${i}`} spaceId={s} size={12}/>)}
              <span style={{ fontSize: '.72rem', color: 'var(--sage)', fontWeight: 500 }}>
                Same {sharedSpaces.length === 1 ? 'chapter' : `${sharedSpaces.length} chapters`}
              </span>
            </div>
          ) : (
            <div style={{ fontSize: '.72rem', color: 'var(--ink-4)', marginTop: '.2rem' }}>
              {person.spaces.slice(0, 2).map((s, i) => (
                <span key={i} style={{ marginRight: '.3rem' }}><SpaceIcon spaceId={s} size={11}/></span>
              ))}
            </div>
          )}
          {person.openTo && (
            <div style={{ fontSize: '.72rem', color: 'var(--ink-3)', marginTop: '.15rem', lineHeight: 1.35,
              overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' as const }}>
              Open to: {person.openTo}
            </div>
          )}
        </div>
        <button onClick={handleWave} disabled={waveState !== 'idle'}
          style={{ padding: '.42rem .85rem', borderRadius: 100, fontSize: '.8rem', fontWeight: 600,
            flexShrink: 0, transition: 'all .2s', cursor: waveState === 'idle' ? 'pointer' : 'default',
            background: waveState === 'sent' ? 'var(--ember)' : 'transparent',
            color: waveState === 'sent' ? '#fff' : 'var(--ember)',
            border: '1.5px solid var(--ember)', opacity: waveState === 'sending' ? .6 : 1 }}>
          {waveState === 'sending'
            ? <Spinner size={12} color="var(--ember)"/>
            : <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Icon name="wave" size={13} stroke={waveState === 'sent' ? '#fff' : 'var(--ember)'} sw={1.6}/>
                {waveState === 'sent' ? 'Waved' : 'Wave'}
              </span>}
        </button>
      </div>
    </div>
  );
}
