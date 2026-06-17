'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Logo } from '@/components/ui/Logo';
import { Field } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { authApi, ApiError } from '@/lib/api';

function ResetPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleReset() {
    setError('');
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (!token) { setError('Missing reset token. Request a new link.'); return; }

    setLoading(true);
    try {
      await authApi.resetPassword({ token, password });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ height: '100vh', width: '100vw', background: 'var(--cream)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ width: '100%', maxWidth: 440 }} className="rise">
        <div className="card" style={{ padding: '2.4rem 2.2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.4rem' }}><Logo size={24}/></div>

          {done ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--green-dim)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.1rem' }}>
                <Icon name="check" size={26} stroke="var(--green)"/>
              </div>
              <h2 className="serif" style={{ fontSize: '1.8rem', fontWeight: 600, marginBottom: '.5rem' }}>Password updated.</h2>
              <p style={{ color: 'var(--ink-2)', marginBottom: '1.4rem' }}>Sign in with your new password.</p>
              <button className="btn btn-primary btn-block" onClick={() => router.push('/auth')}>Sign in</button>
            </div>
          ) : (
            <>
              <h2 className="serif" style={{ fontSize: '1.8rem', fontWeight: 600, marginBottom: '.4rem' }}>Choose a new password.</h2>
              <p style={{ color: 'var(--ink-2)', marginBottom: '1.4rem' }}>Make it something you'll remember.</p>
              {error && (
                <div style={{ background: 'var(--red-dim)', border: '1px solid var(--red-bdr)', borderRadius: 'var(--r-md)',
                  padding: '.7rem 1rem', marginBottom: '1rem', fontSize: '.88rem', color: 'var(--red)' }}>{error}</div>
              )}
              <Field label="New password" type="password" value={password} onChange={setPassword} placeholder="At least 8 characters"/>
              <Field label="Confirm password" type="password" value={confirm} onChange={setConfirm} placeholder="Type it again"/>
              <button className="btn btn-primary btn-block" disabled={loading} onClick={handleReset}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.5rem' }}>
                {loading ? 'Updating…' : <> Update password <Icon name="arrow" size={17} stroke="#fff"/></>}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return <Suspense><ResetPasswordInner /></Suspense>;
}
