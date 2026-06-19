'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { OBShell } from '@/components/features/OBShell';
import { Icon } from '@/components/ui/Icon';
import { useUserStore } from '@/store/useUserStore';
import { usersApi } from '@/lib/api';

export default function ObName() {
  const router = useRouter();
  const { user, setUser } = useUserStore();
  const [name, setName] = useState(user.name === 'You' ? '' : user.name);

  return (
    <OBShell step={2} onBack={() => router.push('/onboarding/welcome')}>
      <div style={{ textAlign: 'center', margin: 'auto 0', maxWidth: 420, marginInline: 'auto' }}>
        <h1 className="serif" style={{ fontSize: 'clamp(1.7rem, 7vw, 2.4rem)', fontWeight: 600, marginBottom: '.6rem' }}>
          What do we call you?
        </h1>
        <p style={{ color: 'var(--ink-2)', marginBottom: '2rem' }}>
          Just your first name. No handle. No username.
        </p>
        <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="First name"
          style={{ width: '100%', textAlign: 'center', padding: '1rem', fontSize: '1.3rem',
            background: 'var(--white)', border: '1.5px solid var(--border-2)',
            borderRadius: 'var(--r-lg)', marginBottom: '1.6rem' }}
          onFocus={e => { e.target.style.borderColor = 'var(--ember)'; e.target.style.boxShadow = '0 0 0 3px var(--ember-dim)'; }}
          onBlur={e  => { e.target.style.borderColor = 'var(--border-2)'; e.target.style.boxShadow = 'none'; }}/>
        <div>
          <button className="btn btn-primary btn-lg btn-pill"
            disabled={name.trim().length < 2}
            onClick={() => {
              const n = name.trim();
              setUser(u => ({ ...u, name: n }));
              usersApi.updateMe({ displayName: n }).catch(() => {});
              router.push('/onboarding/spaces');
            }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '.5rem' }}>
            That's me <Icon name="arrow" stroke="#fff"/>
          </button>
        </div>
        <p style={{ marginTop: '1.4rem', fontSize: '.82rem', color: 'var(--ink-3)' }}>
          This is how your circle will know you.
        </p>
      </div>
    </OBShell>
  );
}
