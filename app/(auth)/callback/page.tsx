'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { hydrateSession } from '@/lib/session';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    hydrateSession().then(({ authenticated, onboardingCompleted }) => {
      if (!authenticated) { router.replace('/auth'); return; }
      router.replace(onboardingCompleted ? '/home' : '/onboarding/welcome');
    });
  }, [router]);

  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cream)' }}>
      <div style={{ textAlign: 'center' }} className="fade-in">
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--ember)',
          animation: 'pulseDot 1.5s ease infinite', margin: '0 auto' }}/>
        <p style={{ marginTop: '1.2rem', color: 'var(--ink-3)', fontSize: '.92rem' }}>Signing you in…</p>
      </div>
    </div>
  );
}
