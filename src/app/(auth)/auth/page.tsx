'use client';
import { useState, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Logo } from '@/components/ui/Logo';
import { Field } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { authApi, ApiError } from '@/lib/api';
import { hydrateSession } from '@/lib/session';
import { setupPush } from '@/lib/push';
import { useTheme } from '@/hooks/useTheme';
import { toggleTheme } from '@/lib/theme';

function GoogleBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="btn btn-ghost btn-block"
      style={{ borderColor: 'var(--border-2)', color: 'var(--ink-2)', gap: '.7rem' }}>
      <svg width="18" height="18" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
        <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.4 5.4 2.5 13.3l7.8 6c1.9-5.6 7.2-9.8 13.7-9.8Z"/>
        <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.1 5.3-4.6 7l7.1 5.5c4.2-3.9 6.6-9.6 6.6-16.5Z"/>
        <path fill="#FBBC05" d="M10.3 28.3c-.5-1.4-.8-2.9-.8-4.3s.3-3 .8-4.3l-7.8-6C.9 16.8 0 20.3 0 24s.9 7.2 2.5 10.3l7.8-6Z"/>
        <path fill="#34A853" d="M24 48c6.2 0 11.5-2 15.3-5.6l-7.1-5.5c-2 1.4-4.6 2.2-8.2 2.2-6.5 0-11.8-4.2-13.7-9.8l-7.8 6C6.4 42.6 14.6 48 24 48Z"/>
      </svg>
      Continue with Google
    </button>
  );
}

function AuthForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const theme        = useTheme();
  const nextUrl      = searchParams.get('next') || '';
  const safeNext     = /^\/[^/]/.test(nextUrl) ? nextUrl : '/home';

  const [tab,           setTab]          = useState<'signup' | 'signin'>('signup');
  const [agree,         setAgree]        = useState(false);
  const [loading,       setLoading]      = useState(false);
  const [error,         setError]        = useState('');
  const [name,          setName]         = useState('');
  const [email,         setEmail]        = useState('');
  const [password,      setPassword]     = useState('');
  const [loginEmail,    setLoginEmail]   = useState('');
  const [loginPassword, setLoginPassword]= useState('');

  async function handleSignup() {
    setError('');
    if (!name.trim())        { setError('Please enter your first name.'); return; }
    if (!email.trim())       { setError('Please enter your email.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setLoading(true);
    try {
      await authApi.signup({ email: email.trim(), password, display_name: name.trim() });
      await hydrateSession();
      setupPush().catch(() => {});
      router.push('/onboarding/welcome');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
    } finally { setLoading(false); }
  }

  async function handleLogin() {
    setError('');
    if (!loginEmail.trim()) { setError('Please enter your email.'); return; }
    if (!loginPassword)     { setError('Please enter your password.'); return; }
    setLoading(true);
    try {
      await authApi.login({ email: loginEmail.trim(), password: loginPassword });
      const { onboardingCompleted } = await hydrateSession();
      setupPush().catch(() => {});
      router.push(onboardingCompleted ? safeNext : '/onboarding/welcome');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
    } finally { setLoading(false); }
  }

  return (
    <div style={{
      minHeight: '100dvh', width: '100vw',
      display: 'flex', background: 'var(--bg)',
      transition: 'background .25s',
      overflow: 'auto',
    }}>
      {/* ── Left brand panel (desktop only) ── */}
      <div className="auth-brand-panel" style={{
        flex: '0 0 45%', maxWidth: 520,
        background: 'linear-gradient(145deg, var(--forest) 0%, var(--forest-2) 55%, var(--forest-3) 100%)',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        padding: '2.4rem 2.8rem', position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative circles */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          {[180, 280, 380, 480].map((r, i) => (
            <div key={i} style={{
              position: 'absolute', right: -r / 2, top: '50%',
              width: r, height: r, borderRadius: '50%',
              border: '1px solid rgba(255,255,255,0.06)',
              transform: 'translateY(-50%)',
            }}/>
          ))}
          <div style={{
            position: 'absolute', bottom: -80, left: -80,
            width: 320, height: 320, borderRadius: '50%',
            background: 'rgba(78,125,94,0.18)',
          }}/>
        </div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <Logo size={24} light/>
        </div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 className="serif" style={{
            fontSize: 'clamp(2rem, 3vw, 2.8rem)', fontWeight: 600,
            color: '#fff', lineHeight: 1.2, marginBottom: '1rem',
          }}>
            Your chapter.<br/>Your circle.
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '.95rem', lineHeight: 1.7, marginBottom: '2rem' }}>
            A small, intentional app for people<br/>navigating real life chapters.
          </p>
          {[
            'Up to 5 Bonds — earned, not added',
            'Private reflections that stay yours',
            'People in the same chapter as you',
          ].map(t => (
            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: '.7rem',
              marginBottom: '.55rem', color: 'rgba(255,255,255,0.75)', fontSize: '.88rem' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--sage)', flexShrink: 0 }}/>
              {t}
            </div>
          ))}
        </div>

        <p style={{ position: 'relative', zIndex: 1, fontSize: '.72rem', color: 'rgba(255,255,255,0.3)' }}>
          © 2025 Grouw
        </p>
      </div>

      {/* ── Right form panel ── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: 'clamp(1.5rem, 5vw, 3rem)',
        position: 'relative',
      }}>
        {/* Theme toggle */}
        <button onClick={toggleTheme}
          style={{ position: 'absolute', top: '1.2rem', right: '1.2rem',
            width: 40, height: 40, borderRadius: '50%', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            background: 'var(--surf-high)', border: '1px solid var(--border)' }}>
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={17} stroke="var(--ink-3)"/>
        </button>

        {/* Mobile logo (only shows when brand panel is hidden) */}
        <div className="auth-mobile-logo" style={{ marginBottom: '1.5rem', display: 'none' }}>
          <Logo size={24}/>
        </div>

        <div style={{ width: '100%', maxWidth: 420 }} className="rise">
          {/* Tabs */}
          <div style={{ marginBottom: '1.8rem' }}>
            <h2 className="serif" style={{ fontSize: '1.8rem', fontWeight: 600, marginBottom: '.3rem' }}>
              {tab === 'signup' ? 'Begin your chapter.' : 'Welcome back.'}
            </h2>
            <p style={{ fontSize: '.88rem', color: 'var(--ink-3)' }}>
              {tab === 'signup'
                ? <>Already have an account? <button onClick={() => { setTab('signin'); setError(''); }} style={{ color: 'var(--ember)', fontWeight: 500 }}>Sign in</button></>
                : <>New here? <button onClick={() => { setTab('signup'); setError(''); }} style={{ color: 'var(--ember)', fontWeight: 500 }}>Create an account</button></>}
            </p>
          </div>

          {error && (
            <div style={{ background: 'var(--red-dim)', border: '1px solid var(--red-bdr)',
              borderRadius: 'var(--r-md)', padding: '.75rem 1rem', marginBottom: '1.1rem',
              fontSize: '.86rem', color: 'var(--red)', display: 'flex', gap: '.5rem', alignItems: 'flex-start' }}>
              {error}
            </div>
          )}

          {tab === 'signup' ? (
            <>
              <Field label="First name" value={name} onChange={setName} placeholder="What we'll call you" autoComplete="given-name"/>
              <Field label="Email address" type="email" value={email} onChange={setEmail} placeholder="you@email.com" autoComplete="email"/>
              <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="At least 8 characters" autoComplete="new-password"/>
              <label style={{ display: 'flex', gap: '.6rem', alignItems: 'flex-start',
                fontSize: '.82rem', color: 'var(--ink-2)', margin: '.4rem 0 1.4rem', cursor: 'pointer', lineHeight: 1.5 }}>
                <input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)}
                  style={{ marginTop: 2, accentColor: 'var(--ember)', width: 15, height: 15, flexShrink: 0 }}/>
                <span>
                  I agree to Grouw&apos;s{' '}
                  <a onClick={() => router.push('/legal')} style={{ color: 'var(--ember)', cursor: 'pointer' }}>Terms</a>{' '}
                  and{' '}
                  <a onClick={() => router.push('/legal')} style={{ color: 'var(--ember)', cursor: 'pointer' }}>Privacy Policy</a>.
                </span>
              </label>
              <button className="btn btn-primary btn-block" disabled={!agree || loading} onClick={handleSignup}
                style={{ fontSize: '1rem', padding: '.85rem', marginBottom: '1rem' }}>
                {loading ? 'Creating account…' : 'Begin your chapter →'}
              </button>
            </>
          ) : (
            <>
              <Field label="Email address" type="email" value={loginEmail} onChange={setLoginEmail} placeholder="you@email.com"/>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.35rem' }}>
                  <span style={{ fontSize: '.78rem', fontWeight: 500, color: 'var(--ink-2)' }}>Password</span>
                  <button type="button" onClick={() => router.push('/forgot')}
                    style={{ fontSize: '.78rem', color: 'var(--ember)', fontWeight: 500, lineHeight: 1 }}>
                    Forgot password?
                  </button>
                </div>
                <Field type="password" value={loginPassword} onChange={setLoginPassword}
                  placeholder="Your password"/>
              </div>
              <button className="btn btn-primary btn-block" disabled={loading} onClick={handleLogin}
                style={{ fontSize: '1rem', padding: '.85rem', marginBottom: '1rem' }}>
                {loading ? 'Signing in…' : 'Continue →'}
              </button>
            </>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '.8rem', margin: '1rem 0' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border-2)' }}/>
            <span style={{ fontSize: '.76rem', color: 'var(--ink-4)', letterSpacing: '.05em' }}>OR</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border-2)' }}/>
          </div>
          <GoogleBtn onClick={() => { window.location.href = authApi.googleUrl(); }}/>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return <Suspense><AuthForm /></Suspense>;
}
