'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { OBShell } from '@/components/features/OBShell';
import { Icon } from '@/components/ui/Icon';
import { SpaceIcon } from '@/components/ui/SpaceIcon';
import { useUserStore } from '@/store/useUserStore';
import { spaceById, STAGES } from '@/lib/data';

export default function ObStages() {
  const router = useRouter();
  const { user, setUser } = useUserStore();
  const spaces = user.spaces.length ? user.spaces : ['career'];
  const [idx, setIdx] = useState(0);
  const [labels, setLabels] = useState<Record<string, string>>(user.stageLabels || {});
  const space = spaceById(spaces[idx]);
  const opts = STAGES[space.id] || STAGES.career;
  const chosen = labels[space.id];

  const next = () => {
    if (idx < spaces.length - 1) setIdx(idx + 1);
    else { setUser(u => ({ ...u, stageLabels: labels })); router.push('/onboarding/tension'); }
  };

  return (
    <OBShell step={4} onBack={() => idx > 0 ? setIdx(idx - 1) : router.push('/onboarding/spaces')}>
      <div style={{ maxWidth: 480, marginInline: 'auto', width: '100%' }}>
        <div className="label-mono" style={{ textAlign: 'center', marginBottom: '.6rem' }}>
          Space {idx + 1} of {spaces.length}
        </div>
        <h1 className="serif" style={{ fontSize: 'clamp(1.5rem, 6.5vw, 2.1rem)', fontWeight: 600, textAlign: 'center', marginBottom: '1.6rem' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.5rem' }}>
            <SpaceIcon spaceId={space.id} size={22} pill pillSize={40}/>
            {space.name}
          </span> — where are you?
        </h1>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
          {opts.map(o => {
            const on = chosen === o;
            return (
              <button key={o} onClick={() => setLabels({ ...labels, [space.id]: o })}
                style={{ textAlign: 'left', padding: '.95rem 1.1rem', borderRadius: 'var(--r-md)',
                  background: on ? 'var(--ember-dim)' : 'var(--white)',
                  border: '1px solid var(--border)', borderLeft: `4px solid ${on ? 'var(--ember)' : 'transparent'}`,
                  fontWeight: on ? 600 : 500, fontSize: '.95rem',
                  color: on ? 'var(--ember-deep)' : 'var(--ink-2)', transition: 'all .15s' }}>
                {o}
              </button>
            );
          })}
        </div>
        <div style={{ textAlign: 'center', marginTop: '1.8rem' }}>
          <button className="btn btn-primary btn-lg btn-pill" disabled={!chosen} onClick={next}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '.5rem' }}>
            {idx < spaces.length - 1 ? "That's where I am" : 'Continue'} <Icon name="arrow" stroke="#fff"/>
          </button>
        </div>
      </div>
    </OBShell>
  );
}
