'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { OBShell } from '@/components/features/OBShell';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { useUserStore } from '@/store/useUserStore';
import { useSpaceStore } from '@/store/useSpaceStore';
import { profilesApi, spacesApi, usersApi } from '@/lib/api';
import { SpaceIcon } from '@/components/ui/SpaceIcon';
import { spaceById } from '@/lib/data';

export default function ObReady() {
  const router = useRouter();
  const { user, setUser } = useUserStore();
  const { uuidBySlug } = useSpaceStore();
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => { const t = setTimeout(() => setShow(true), 1800); return () => clearTimeout(t); }, []);

  const spaces = (user.spaces.length ? user.spaces : ['career', 'creative']).map(spaceById);
  const circleNames = ['Amara Lindqvist', 'David Okonkwo', 'Ruth Nakamura'];
  const sizes = [118, 150, 118];

  return (
    <OBShell>
      <div style={{ textAlign: 'center', margin: 'auto 0', maxWidth: 520, marginInline: 'auto' }}>
        {/* Circle scene */}
        <div className="ob-scene fade-in" style={{ position: 'relative', width: 'min(360px, 100%)', height: 180, margin: '0 auto 1.6rem' }}>
          {circleNames.map((name, i) => {
            const offset = (i - 1) * 72;
            return (
              <div key={name} style={{ position: 'absolute', left: '50%', top: '50%',
                transform: `translate(-50%,-50%) translateX(${offset}px)`, zIndex: i === 1 ? 3 : 1 }}>
                <Avatar name={name} size={sizes[i]}
                  style={{ boxShadow: '0 0 0 5px var(--cream), 0 14px 34px -10px rgba(26,26,26,.26)', borderRadius: '50%' }}/>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '.8rem', marginBottom: '1.6rem' }}>
          {spaces.map((s, i) => (
            <span key={s.id} className="rise" style={{ animationDelay: `${i * 0.12}s` }}>
              <SpaceIcon spaceId={s.id} size={22} pill pillSize={44}/>
            </span>
          ))}
        </div>
        <h1 className="serif" style={{ fontSize: 'clamp(1.8rem, 7.5vw, 2.6rem)', fontWeight: 600, lineHeight: 1.15, marginBottom: '1rem' }}>
          Your Grouw is ready, {user.name}.
        </h1>
        <p style={{ fontSize: 'clamp(.95rem, 4vw, 1.1rem)', color: 'var(--ink-2)', lineHeight: 1.6 }}>
          A small circle of people in the same chapters as you is being assembled. Show up honestly.
        </p>
        <div style={{ marginTop: '2.2rem', minHeight: 70, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.8rem' }}>
          {show && (
            <button className="btn btn-primary btn-lg btn-pill fade-in"
              disabled={saving}
              onClick={async () => {
                setSaving(true);

                // Mark as complete in local store immediately so navigation works
                setUser(u => ({ ...u, onboardingCompleted: true }));

                // Save everything independently — one failure doesn't block the others
                const saves = await Promise.allSettled([
                  // 1. Mark onboarding complete
                  profilesApi.updateMe({ display_name: user.name, onboarding_completed: true }),
                  // 2. Save honest fields
                  usersApi.updateMe({
                    honestTension: user.tension || null,
                    sittingWith:   user.sitting || null,
                    openTo:        user.open    || null,
                  }),
                  // 3. Save each space with its stage
                  ...user.spaces.map(slug => {
                    const uuid = uuidBySlug(slug);
                    if (!uuid) return Promise.resolve();
                    return spacesApi.open({
                      spaceId:   uuid,
                      stage:     user.stageLabels?.[slug] || undefined,
                      isPrimary: slug === user.spaces[0],
                    });
                  }),
                ]);

                const anyFailed = saves.some(s => s.status === 'rejected');
                if (anyFailed && process.env.NODE_ENV === 'development') {
                  const errors = saves
                    .filter((s): s is PromiseRejectedResult => s.status === 'rejected')
                    .map(s => s.reason?.message ?? String(s.reason));
                  console.warn('[onboarding] some saves failed:', errors);
                }

                // Always navigate — hydrateSession repairs any DB gaps on next login
                setSaving(false);
                router.push('/home');
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '.5rem' }}>
              {saving ? 'Saving…' : <> Enter Grouw <Icon name="arrow" stroke="#fff"/></>}
            </button>
          )}
        </div>
      </div>
    </OBShell>
  );
}
