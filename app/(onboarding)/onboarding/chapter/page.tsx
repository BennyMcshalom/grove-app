'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { OBShell } from '@/components/features/OBShell';
import { Icon } from '@/components/ui/Icon';
import { useUserStore } from '@/store/useUserStore';
import { useSpaceStore } from '@/store/useSpaceStore';
import { chaptersApi } from '@/lib/api';

const HOWS = ['Just started', 'A few months', 'About a year', 'A while now'];

function HonestCard({ label, ph, max, value, onChange }: {
  label: string; ph: string; max: number; value: string; onChange: (v: string) => void;
}) {
  const [foc, setFoc] = useState(false);
  return (
    <div style={{ background: 'var(--white)', borderRadius: 'var(--r-md)', padding: '1.1rem 1.2rem',
      borderLeft: foc ? '3px solid var(--ember)' : '3px solid transparent',
      border: '1px solid var(--border)', borderLeftWidth: 3, borderLeftColor: foc ? 'var(--ember)' : 'transparent',
      boxShadow: foc ? '0 4px 18px -6px rgba(243,112,30,.25)' : 'var(--shadow-soft)', transition: 'all .2s' }}>
      <div style={{ fontWeight: 600, fontSize: '.92rem', marginBottom: '.5rem' }}>{label}</div>
      <textarea value={value} onChange={e => onChange(e.target.value.slice(0, max))}
        placeholder={ph} onFocus={() => setFoc(true)} onBlur={() => setFoc(false)}
        style={{ width: '100%', minHeight: 70, resize: 'vertical', border: 'none', background: 'transparent', fontSize: '.95rem', lineHeight: 1.55 }}/>
      <div style={{ textAlign: 'right', fontSize: '.68rem', color: 'var(--ink-4)', fontFamily: 'DM Mono, monospace' }}>{value.length}/{max}</div>
    </div>
  );
}

export default function ObChapter() {
  const router = useRouter();
  const { setUser } = useUserStore();
  const [f, setF] = useState({ happening: '', unsaid: '', looking: '', how: '' });

  return (
    <OBShell step={6} onBack={() => router.push('/onboarding/tension')}>
      <div style={{ maxWidth: 540, marginInline: 'auto', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.6rem' }}>
          <h1 className="serif" style={{ fontSize: 'clamp(1.5rem, 6.5vw, 2.1rem)', fontWeight: 600, marginBottom: '.5rem' }}>
            Before we show you anyone else —
          </h1>
          <p style={{ color: 'var(--ink-2)' }}>Tell us what's actually happening. This shapes everything Grouw shows you.</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.9rem' }}>
          <HonestCard label="What's actually happening right now?" ph="Not the headline. The real situation." max={300} value={f.happening} onChange={v => setF({ ...f, happening: v })}/>
          <HonestCard label="What haven't you said out loud yet?" ph="The thing you've been carrying quietly…" max={250} value={f.unsaid} onChange={v => setF({ ...f, unsaid: v })}/>
          <HonestCard label="What are you looking for?" ph="People, ideas, accountability, honesty, something else…" max={200} value={f.looking} onChange={v => setF({ ...f, looking: v })}/>
          <div style={{ background: 'var(--white)', borderRadius: 'var(--r-md)', padding: '1.1rem 1.2rem', border: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 600, fontSize: '.92rem', marginBottom: '.7rem' }}>How long have you been in this chapter?</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem' }}>
              {HOWS.map(h => (
                <button key={h} onClick={() => setF({ ...f, how: h })} className="chip"
                  style={{ cursor: 'pointer', padding: '.5rem .9rem',
                    background: f.how === h ? 'var(--ember)' : 'var(--surf-high)',
                    color: f.how === h ? '#fff' : 'var(--ink-2)', fontWeight: 500 }}>
                  {h}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'center', marginTop: '1.6rem' }}>
          <button className="btn btn-primary btn-lg btn-pill"
            onClick={async () => {
              setUser(u => ({ ...u, intake: f } as typeof u & { intake: typeof f }));
              // Save intake data — best-effort, don't block navigation
              const { uuidBySlug } = (await import('@/store/useSpaceStore')).useSpaceStore.getState();
              const { user } = (await import('@/store/useUserStore')).useUserStore.getState();
              const primaryUuid = uuidBySlug(user.spaces[0] ?? 'career');
              if (primaryUuid) {
                chaptersApi.intake({
                  spaceId: primaryUuid,
                  whatsHappening: f.happening || undefined,
                  duration: f.how || undefined,
                  lookingFor: f.looking || undefined,
                  unsaid: f.unsaid || undefined,
                }).catch(() => {});
              }
              router.push('/onboarding/ready');
            }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '.5rem' }}>
            I'm ready <Icon name="arrow" stroke="#fff"/>
          </button>
          <p style={{ marginTop: '1rem', fontSize: '.8rem', color: 'var(--ink-3)' }}>
            Private. Never shown to anyone. Used only to personalise your experience.
          </p>
        </div>
      </div>
    </OBShell>
  );
}
