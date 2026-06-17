'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/ui/Logo';
import { Field } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { authApi, ApiError } from '@/lib/api';

export default function ForgotPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSend() {
    setError('');
    if (!email.trim()) { setError('Please enter your email address.'); return; }
    setLoading(true);
    try {
      await authApi.forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100dvh', width: '100vw', background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem',
      transition: 'background .25s' }}>
      <div style={{ width: '100%', maxWidth: 440 }} className="rise">
        <div className="card" style={{ padding: '2.4rem 2.2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.4rem' }}><Logo size={24}/></div>

          {sent ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--green-dim)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.1rem' }}>
                <Icon name="check" size={26} stroke="var(--green)"/>
              </div>
              <h2 className="serif" style={{ fontSize: '1.6rem', fontWeight: 600, marginBottom: '.5rem' }}>Reset link sent.</h2>
              <p style={{ color: 'var(--ink-2)', marginBottom: '1.4rem' }}>
                Check your inbox at <strong>{email}</strong>. The link expires in 1 hour.
              </p>
              <button className="btn btn-ghost btn-block" onClick={() => router.push('/auth')}>
                Back to sign in
              </button>
            </div>
          ) : (
            <>
              <h2 className="serif" style={{ fontSize: '1.8rem', fontWeight: 600, marginBottom: '.4rem' }}>Reset your password.</h2>
              <p style={{ color: 'var(--ink-2)', marginBottom: '1.4rem' }}>Enter your email. We'll send a reset link.</p>
              {error && (
                <div style={{ background: 'var(--red-dim)', border: '1px solid var(--red-bdr)', borderRadius: 'var(--r-md)',
                  padding: '.7rem 1rem', marginBottom: '1rem', fontSize: '.88rem', color: 'var(--red)' }}>{error}</div>
              )}
              <Field label="Email address" type="email" value={email} onChange={setEmail} placeholder="you@email.com"/>
              <button className="btn btn-primary btn-block" disabled={loading} onClick={handleSend}>
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
              <button onClick={() => router.push('/auth')}
                style={{ display: 'block', margin: '1.1rem auto 0', fontSize: '.84rem', color: 'var(--ink-3)' }}>
                ← Back to sign in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
