'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { useUserStore } from '@/store/useUserStore';
import { authApi, ApiError } from '@/lib/api';
import { hydrateSession } from '@/lib/session';
import { useToastStore } from '@/store/useToastStore';
import { Icon } from '@/components/ui/Icon';
import { Logo } from '@/components/ui/Logo';
import { Spinner } from '@/components/ui/Spinner';
import { OtpInput } from '@/components/ui/OtpInput';

const CODE_TTL_SECONDS = 8 * 60;
const RESEND_COOLDOWN = 60;

function fmt(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export default function VerifyPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { toast } = useToastStore();

  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [expiresIn, setExpiresIn] = useState(CODE_TTL_SECONDS);
  const [resendCd, setResendCd] = useState(0);
  const [resending, setResending] = useState(false);

  // Reachable from both fresh signup and a later login by an account that
  // never finished verifying — so "done" doesn't always mean "start onboarding".
  function nextDestination(): string {
    return useUserStore.getState().user.onboardingCompleted ? '/home' : '/onboarding/welcome';
  }

  // Already verified (e.g. navigated back here after completing it) — move on.
  useEffect(() => {
    if (user?.emailVerifiedAt) router.replace(nextDestination());
  }, [user?.emailVerifiedAt, router]);

  useEffect(() => {
    if (expiresIn <= 0) return;
    const t = setTimeout(() => setExpiresIn(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [expiresIn]);

  useEffect(() => {
    if (resendCd <= 0) return;
    const t = setTimeout(() => setResendCd(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCd]);

  async function handleVerify(value: string) {
    if (value.length !== 6 || verifying) return;
    setVerifying(true);
    setError('');
    try {
      await authApi.verifySignupCode(value);
      await hydrateSession();
      router.push(nextDestination());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not verify. Try again.');
      setCode('');
    } finally {
      setVerifying(false);
    }
  }

  function handleCodeChange(value: string) {
    setCode(value);
    setError('');
    if (value.length === 6) handleVerify(value);
  }

  async function handleResend() {
    setResending(true);
    try {
      await authApi.resendSignupCode();
      toast('New code sent.');
      setExpiresIn(CODE_TTL_SECONDS);
      setResendCd(RESEND_COOLDOWN);
      setCode('');
      setError('');
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Could not resend. Try again.');
    } finally {
      setResending(false);
    }
  }

  const expired = expiresIn <= 0;

  return (
    <div style={{ height: '100vh', width: '100vw', background: 'var(--cream)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ width: '100%', maxWidth: 440, textAlign: 'center' }} className="rise">
        <div className="card" style={{ padding: '2.6rem 2.2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.4rem' }}><Logo size={24}/></div>

          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--ember-soft)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.3rem' }}>
            <Icon name="envelope" size={32} stroke="var(--ember)"/>
          </div>
          <h2 className="serif" style={{ fontSize: '1.8rem', fontWeight: 600, marginBottom: '.5rem' }}>Check your inbox.</h2>
          <p style={{ color: 'var(--ink-2)', lineHeight: 1.6, marginBottom: '1.6rem' }}>
            We sent a 6-digit code to <strong style={{ color: 'var(--ink)' }}>{user?.email || 'your email'}</strong>.
          </p>

          <OtpInput value={code} onChange={handleCodeChange} disabled={verifying || expired}/>

          <div style={{ marginTop: '1rem', minHeight: 20 }}>
            {verifying ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.4rem', fontSize: '.84rem', color: 'var(--ink-3)' }}>
                <Spinner size={13}/> Verifying…
              </span>
            ) : error ? (
              <span style={{ fontSize: '.84rem', color: 'var(--red)' }}>{error}</span>
            ) : expired ? (
              <span style={{ fontSize: '.84rem', color: 'var(--amber)' }}>This code has expired — request a new one.</span>
            ) : (
              <span style={{ fontSize: '.78rem', color: 'var(--ink-4)', fontFamily: 'var(--font-dm-mono, DM Mono)' }}>
                Expires in {fmt(expiresIn)}
              </span>
            )}
          </div>

          <button className="btn btn-ghost btn-block" style={{ marginTop: '1.4rem' }}
            disabled={resendCd > 0 || resending} onClick={handleResend}>
            {resendCd > 0 ? `Resend in ${resendCd}s` : resending ? 'Sending…' : 'Resend code'}
          </button>
        </div>
        <button onClick={() => router.push('/auth')} style={{ marginTop: '1.1rem', fontSize: '.84rem', color: 'var(--ink-3)' }}>
          Wrong email? Go back
        </button>
      </div>
    </div>
  );
}
