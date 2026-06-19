'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { OBShell } from '@/components/features/OBShell';
import { Icon } from '@/components/ui/Icon';
import { SpaceIcon } from '@/components/ui/SpaceIcon';
import { useUserStore } from '@/store/useUserStore';
import { SPACES } from '@/lib/data';

export default function ObSpaces() {
  const router = useRouter();
  const { user, setUser } = useUserStore();
  const [sel, setSel] = useState<string[]>(user.spaces || []);
  const [shake, setShake] = useState(false);

  const toggle = (id: string) => {
    if (sel.includes(id)) setSel(sel.filter(s => s !== id));
    else if (sel.length >= 4) { setShake(true); setTimeout(() => setShake(false), 450); }
    else setSel([...sel, id]);
  };

  return (
    <OBShell step={3} wide onBack={() => router.push('/onboarding/name')}>
      <div style={{ textAlign: 'center', marginBottom: '1.6rem' }}>
        <h1 className="serif" style={{ fontSize: 'clamp(1.7rem, 7vw, 2.4rem)', fontWeight: 600, marginBottom: '.5rem' }}>
          Which chapters of life are you in?
        </h1>
        <p style={{ color: 'var(--ink-2)' }}>Choose up to four. These are your spaces.</p>
      </div>
      <div className="ob-spaces-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '.9rem' }}>
        {SPACES.map(s => {
          const on = sel.includes(s.id);
          return (
            <button key={s.id} onClick={() => toggle(s.id)} style={{ position: 'relative', textAlign: 'center',
              padding: '1.5rem 1rem', borderRadius: 'var(--r-lg)', background: 'var(--white)',
              border: on ? '2px solid var(--ember)' : '2px solid transparent',
              boxShadow: on ? '0 6px 20px -6px rgba(243,112,30,.35)' : 'var(--shadow)', transition: 'all .15s' }}>
              {on && (
                <span style={{ position: 'absolute', top: 10, right: 10, width: 22, height: 22, borderRadius: '50%',
                  background: 'var(--ember)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="check" size={13} stroke="#fff"/>
                </span>
              )}
              <div style={{ marginBottom: '.7rem' }}><SpaceIcon spaceId={s.id} size={28} pill pillSize={56}/></div>
              <div className="serif" style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '.2rem' }}>{s.name}</div>
              <div style={{ fontSize: '.74rem', color: 'var(--ink-3)', lineHeight: 1.35 }}>{s.desc}</div>
            </button>
          );
        })}
      </div>
      <div style={{ textAlign: 'center', marginTop: '1.8rem' }}>
        <div className={shake ? 'shake' : ''} style={{ color: sel.length ? 'var(--ember)' : 'var(--ink-3)', fontWeight: 500, marginBottom: '1rem' }}>
          {sel.length} / 4 chosen{sel.length >= 4 && <span style={{ color: 'var(--ink-3)', fontWeight: 400 }}> · You can only hold 4 chapters at once</span>}
        </div>
        <button className="btn btn-primary btn-lg btn-pill" disabled={!sel.length}
          onClick={() => { setUser(u => ({ ...u, spaces: sel })); router.push('/onboarding/stages'); }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '.5rem' }}>
          These are my chapters <Icon name="arrow" stroke="#fff"/>
        </button>
      </div>
    </OBShell>
  );
}
