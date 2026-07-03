'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { OBShell } from '@/components/features/OBShell';
import { Icon } from '@/components/ui/Icon';
import { useUserStore } from '@/store/useUserStore';
import { usersApi } from '@/lib/api';

function HonestCard({ label, ph, max, value, onChange }: {
  label: string; ph: string; max: number; value: string; onChange: (v: string) => void;
}) {
  const [foc, setFoc] = useState(false);
  return (
    <div style={{ background: 'var(--white)', borderRadius: 'var(--r-md)', padding: '1.1rem 1.2rem',
      borderLeft: foc ? '3px solid var(--ember)' : '3px solid transparent',
      border: '1px solid var(--border)', borderLeftWidth: 3,
      borderLeftColor: foc ? 'var(--ember)' : 'transparent',
      boxShadow: foc ? '0 4px 18px -6px rgba(243,112,30,.25)' : 'var(--shadow-soft)', transition: 'all .2s' }}>
      <div style={{ fontWeight: 600, fontSize: '.92rem', marginBottom: '.5rem' }}>{label}</div>
      <textarea value={value} onChange={e => onChange(e.target.value.slice(0, max))}
        placeholder={ph} onFocus={() => setFoc(true)} onBlur={() => setFoc(false)}
        style={{ width: '100%', minHeight: 70, resize: 'vertical', border: 'none',
          background: 'transparent', fontSize: '.95rem', lineHeight: 1.55 }}/>
      <div style={{ textAlign: 'right', fontSize: '.68rem', color: 'var(--ink-4)', fontFamily: 'DM Mono, monospace' }}>
        {value.length}/{max}
      </div>
    </div>
  );
}

export default function ObTension() {
  const router = useRouter();
  const { user, setUser } = useUserStore();
  const [f, setF] = useState({ tension: user.tension || '', sitting: user.sitting || '', open: user.open || '' });

  return (
    <OBShell step={5} onBack={() => router.push('/onboarding/stages')}>
      <div style={{ maxWidth: 540, marginInline: 'auto', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.6rem' }}>
          <h1 className="serif" style={{ fontSize: 'clamp(1.5rem, 6.5vw, 2.1rem)', fontWeight: 600, marginBottom: '.5rem' }}>
            This is what makes your profile yours.
          </h1>
          <p style={{ color: 'var(--ink-2)' }}>Three questions. Honest answers. Only your Bonds will ever see these.</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.9rem' }}>
          <HonestCard label="My honest tension right now" ph="The thing I'm not quite saying out loud is…" max={200} value={f.tension} onChange={v => setF({ ...f, tension: v })}/>
          <HonestCard label="I'm sitting with" ph="Something I haven't resolved yet…" max={150} value={f.sitting} onChange={v => setF({ ...f, sitting: v })}/>
          <HonestCard label="I'm open to" ph="The kind of people, ideas, or conversations I need…" max={150} value={f.open} onChange={v => setF({ ...f, open: v })}/>
        </div>
        <div style={{ textAlign: 'center', marginTop: '1.6rem' }}>
          <button className="btn btn-primary btn-lg btn-pill"
            onClick={async () => {
              setUser(u => ({ ...u, ...f }));
              try {
                await usersApi.updateMe({
                  honestTension: f.tension || null,
                  sittingWith:   f.sitting  || null,
                  openTo:        f.open     || null,
                });
              } catch {}
              router.push('/onboarding/chapter');
            }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '.5rem' }}>
            Continue <Icon name="arrow" stroke="#fff"/>
          </button>
          <p style={{ marginTop: '1rem', fontSize: '.8rem', color: 'var(--ink-3)' }}>
            You can update these any time from your profile.
          </p>
        </div>
      </div>
    </OBShell>
  );
}
