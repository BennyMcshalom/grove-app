'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { Logo } from '@/components/ui/Logo';
import { authApi, ApiError } from '@/lib/api';

function VerifyEmailInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) { setStatus('error'); setErrorMsg('Missing verification token.'); return; }

    authApi.verifyEmail(token)
      .then(() => setStatus('success'))
      .catch(err => {
        setStatus('error');
        setErrorMsg(err instanceof ApiError ? err.message : 'Invalid or expired link.');
      });
  }, [token]);

  return (
    <div style={{ height: '100vh', width: '100vw', background: 'var(--cream)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ width: '100%', maxWidth: 440, textAlign: 'center' }} className="rise">
        <div className="card" style={{ padding: '2.6rem 2.2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.4rem' }}><Logo size={24}/></div>

          {status === 'verifying' && (
            <>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--ember)',
                animation: 'pulseDot 1.5s ease infinite', margin: '0 auto 1.2rem' }}/>
              <p style={{ color: 'var(--ink-3)' }}>Verifying your email…</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--green-dim)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.1rem' }}>
                <Icon name="check" size={26} stroke="var(--green)"/>
              </div>
              <h2 className="serif" style={{ fontSize: '1.8rem', fontWeight: 600, marginBottom: '.5rem' }}>Email verified.</h2>
              <p style={{ color: 'var(--ink-2)', marginBottom: '1.4rem' }}>
                Your account is active. You can now sign in.
              </p>
              <button className="btn btn-primary btn-block" onClick={() => router.push('/auth')}>
                Sign in
              </button>
            </>
          )}

          {status === 'error' && (
            <>
              <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--red-dim)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.1rem' }}>
                <Icon name="close" size={24} stroke="var(--red)"/>
              </div>
              <h2 className="serif" style={{ fontSize: '1.8rem', fontWeight: 600, marginBottom: '.5rem' }}>Link expired.</h2>
              <p style={{ color: 'var(--ink-2)', marginBottom: '1.4rem' }}>{errorMsg}</p>
              <button className="btn btn-primary btn-block" onClick={() => router.push('/auth')}>
                Back to sign in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return <Suspense><VerifyEmailInner /></Suspense>;
}
