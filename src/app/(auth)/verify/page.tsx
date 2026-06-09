'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { authApi, ApiError } from '@/lib/api';
import { useToastStore } from '@/store/useToastStore';
import { Icon } from '@/components/ui/Icon';

export default function VerifyPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { toast } = useToastStore();
  const [cd, setCd] = useState(0);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (cd <= 0) return;
    const t = setTimeout(() => setCd(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cd]);

  async function handleResend() {
    if (!user?.email) return;
    setResending(true);
    try {
      await authApi.forgotPassword(user.email);
      toast('Verification email resent.');
      setCd(60);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Could not resend. Try again.');
    } finally {
      setResending(false);
    }
  }

  return (
    <div style={{ height: '100vh', width: '100vw', background: 'var(--cream)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ width: '100%', maxWidth: 440, textAlign: 'center' }} className="rise">
        <div className="card" style={{ padding: '2.6rem 2.2rem' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--ember-soft)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.3rem' }}>
              <Icon name="envelope" size={32} stroke="var(--ember)"/>
            </div>
          <h2 className="serif" style={{ fontSize: '2rem', fontWeight: 600, marginBottom: '.5rem' }}>Check your inbox.</h2>
          <p style={{ color: 'var(--ink-2)', lineHeight: 1.6, marginBottom: '.5rem' }}>
            We sent a confirmation to{' '}
            <strong style={{ color: 'var(--ink)' }}>{user?.email || 'your email'}</strong>.
            Click the link to activate your account.
          </p>
          <p style={{ color: 'var(--ink-3)', fontSize: '.84rem', marginBottom: '1.6rem' }}>
            It might take a minute. Check your spam folder too.
          </p>
          <button className="btn btn-primary btn-block" style={{ marginBottom: '.7rem' }}
            onClick={() => router.push('/onboarding/welcome')}>
            Continue to onboarding
          </button>
          <button className="btn btn-ghost btn-block" disabled={cd > 0 || resending} onClick={handleResend}>
            {cd > 0 ? `Resend in ${cd}s` : resending ? 'Sending…' : 'Resend email'}
          </button>
        </div>
        <button onClick={() => router.push('/auth')} style={{ marginTop: '1.1rem', fontSize: '.84rem', color: 'var(--ink-3)' }}>
          Wrong email? Go back
        </button>
      </div>
    </div>
  );
}
