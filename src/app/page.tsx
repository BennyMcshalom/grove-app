'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { useUserStore } from '@/store/useUserStore';

export default function Splash() {
  const router = useRouter();
  const { isInitialized, user: authUser } = useAuthStore();
  const { user } = useUserStore();

  useEffect(() => {
    if (!isInitialized) return;

    if (!authUser) {
      // Not logged in → sign-in page
      router.replace('/auth');
    } else if (!user.onboardingCompleted) {
      // Logged in, onboarding not done → start onboarding
      router.replace('/onboarding/welcome');
    } else {
      // Fully set up → home
      router.replace('/home');
    }
  }, [isInitialized, authUser, user.onboardingCompleted, router]);

  return (
    <div style={{
      height: '100vh', width: '100vw', background: 'var(--cream)',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{ textAlign: 'center' }} className="fade-in">
        <div className="serif" style={{ fontSize: '4rem', fontWeight: 600, color: 'var(--ember)', lineHeight: 1 }}>
          Grouw
        </div>
        <div style={{ marginTop: '.9rem', color: 'var(--ink-3)', fontSize: '1.05rem' }}>
          Your chapter. Your circle.
        </div>
        <div style={{
          margin: '2.4rem auto 0', width: 10, height: 10, borderRadius: '50%',
          background: 'var(--ember)', animation: 'pulseDot 1.5s ease infinite'
        }} />
      </div>
    </div>
  );
}
