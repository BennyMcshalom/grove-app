'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/store/useUserStore';
import { usersApi } from '@/lib/api';
import { Icon } from '@/components/ui/Icon';

const DURATIONS = ['Until this evening','Until tomorrow, 8am','For 3 days','For a week'];

export default function DeepFocusPage() {
  const router = useRouter();
  const { user, setUser } = useUserStore();
  const [active, setActive] = useState(user.deepFocus || false);
  const [confirm, setConfirm] = useState('');
  const [dur, setDur] = useState('Until tomorrow, 8am');

  if (!active) {
    return (
      <div style={{ height: '100vh', width: '100vw', background: 'var(--cream)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ maxWidth: 440, width: '100%', textAlign: 'center' }} className="rise">
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--surf-high)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <Icon name="moon" size={28} stroke="var(--ink-3)"/>
          </div>
          <h1 className="serif" style={{ fontSize: '2.2rem', fontWeight: 600, marginBottom: '.6rem' }}>Go into Deep Focus.</h1>
          <p style={{ color: 'var(--ink-2)', marginBottom: '1.6rem' }}>
            Grouw locks until you choose to return. No counter waiting for you when you come back.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem', marginBottom: '1.6rem' }}>
            {DURATIONS.map(d => (
              <button key={d} onClick={() => setDur(d)} className="card"
                style={{ padding: '.9rem', fontWeight: 500, fontSize: '.92rem',
                  borderLeft: dur === d ? '4px solid var(--ember)' : '4px solid transparent',
                  background: dur === d ? 'var(--ember-dim)' : 'var(--white)',
                  color: dur === d ? 'var(--ember-deep)' : 'var(--ink-2)' }}>{d}</button>
            ))}
          </div>
          <button className="btn btn-primary btn-lg btn-block"
            onClick={async () => {
              setActive(true);
              setUser(u => ({ ...u, deepFocus: true }));
              const durMap: Record<string, number> = {
                'Until this evening': 8, 'Until tomorrow, 8am': 24,
                'For 3 days': 72, 'For a week': 168,
              };
              const hours = durMap[dur] ?? 24;
              const endsAt = new Date(Date.now() + hours * 3600_000).toISOString();
              usersApi.deepFocus(true, endsAt).catch(() => {});
            }}>
            Begin Deep Focus
          </button>
          <button onClick={() => router.push('/home')} style={{ marginTop: '1rem', fontSize: '.84rem', color: 'var(--ink-3)', display: 'block', margin: '1rem auto 0' }}>
            Not now
          </button>
        </div>
      </div>
    );
  }

  // The locked screen is always dark — hardcoded so it never flips in dark mode
  const DARK = '#0E0D0A';
  const TEXT = '#F0EAE0';
  const DIM  = 'rgba(240,234,224,.45)';

  return (
    <div style={{ height: '100vh', width: '100vw', background: DARK,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ textAlign: 'center', maxWidth: 440 }} className="fade-in">
        <div style={{ width: 64, height: 64, borderRadius: '50%',
          background: 'rgba(240,234,224,.06)', border: `1.5px solid rgba(240,234,224,.14)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.4rem' }}>
          <Icon name="moon" size={32} stroke={DIM}/>
        </div>
        <h1 className="serif" style={{ fontSize: '2.4rem', fontWeight: 600, color: TEXT }}>
          You&apos;re in Deep Focus.
        </h1>
        <p style={{ color: DIM, fontSize: '1.05rem', marginTop: '.7rem', lineHeight: 1.6 }}>
          Grouw is locked {dur.toLowerCase()}.
        </p>
        <p style={{ color: DIM, fontSize: '1.05rem' }}>Go do the thing.</p>
        {confirm === 'END' ? (
          <button className="fade-in" onClick={() => {
            setActive(false);
            setUser(u => ({ ...u, deepFocus: false }));
            usersApi.deepFocus(false).catch(() => {});
            router.push('/home');
          }}
            style={{ marginTop: '2.4rem', color: '#F3701E', fontWeight: 500,
              fontSize: '.95rem', display: 'block', margin: '2.4rem auto 0' }}>
            End now →
          </button>
        ) : (
          <div style={{ marginTop: '2.4rem' }}>
            <input value={confirm} onChange={e => setConfirm(e.target.value.toUpperCase())}
              placeholder='Type "END" to leave early'
              style={{ background: 'transparent', border: `1px solid rgba(240,234,224,.18)`,
                borderRadius: 100, padding: '.6rem 1.2rem', textAlign: 'center',
                color: TEXT, fontSize: '.85rem', width: 240 }}/>
          </div>
        )}
      </div>
    </div>
  );
}
