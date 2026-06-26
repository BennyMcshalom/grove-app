'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { Spinner } from '@/components/ui/Spinner';

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const { isInitialized, user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isInitialized) return;
    if (!user) { router.replace('/auth'); return; }
    if (!user.emailVerifiedAt) router.replace('/verify');
  }, [isInitialized, user, router]);

  if (!isInitialized) {
    return (
      <div style={{ height: '100vh', width: '100vw', background: 'var(--bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
        <Spinner size={28}/>
        <span style={{ fontSize: '.82rem', color: 'var(--ink-4)', fontFamily: 'var(--font-dm-mono, DM Mono)' }}>
          Loading your chapter…
        </span>
      </div>
    );
  }

  if (!user || !user.emailVerifiedAt) return null;

  return <>{children}</>;
}
