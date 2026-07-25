'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Logo } from '@/components/ui/Logo';
import { Icon } from '@/components/ui/Icon';
import { passwordMeetsRequirements } from '@/components/ui/PasswordChecklist';
import { authApi, ApiError } from '@/lib/api';
import { hydrateSession } from '@/lib/session';
import { setupPush } from '@/lib/push';
import { useTheme } from '@/hooks/useTheme';
import { toggleTheme } from '@/lib/theme';
import { useAuthStore } from '@/store/useAuthStore';
import { useUserStore } from '@/store/useUserStore';
import { GoogleBtn } from '@/components/auth/GoogleBtn';
import { BrandPanel } from '@/components/auth/BrandPanel';
import { SignupForm } from '@/components/auth/SignupForm';
import { SigninForm } from '@/components/auth/SigninForm';

function AuthForm() {
  const router          = useRouter();
  const searchParams    = useSearchParams();
  const theme           = useTheme();
  const nextUrl         = searchParams.get('next') || '';
  const safeNext        = /^\/[^/]/.test(nextUrl) ? nextUrl : '/home';

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
    if (!passwordMeetsRequirements(password)) { setError('Password must be at least 8 characters and include a letter and a number.'); return; }
    setLoading(true);
    try {
      await authApi.signup({ email: email.trim(), password, display_name: name.trim() });
      // A signup is always a brand-new account — never trust whatever this
      // browser had cached from a previous account (see useUserStore.clear).
      useUserStore.getState().clear();
      await hydrateSession();
      setupPush().catch(() => {});
      router.push('/verify');
    } catch (err) {
      if (err instanceof ApiError && err.status === 0) {
        useAuthStore.getState().setApiUnreachable(true);
      } else {
        setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
      }
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
      if (!useAuthStore.getState().user?.emailVerifiedAt) {
        router.push('/verify');
        return;
      }
      router.push(onboardingCompleted ? safeNext : '/onboarding/welcome');
    } catch (err) {
      if (err instanceof ApiError && err.status === 0) {
        useAuthStore.getState().setApiUnreachable(true);
      } else {
        setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
      }
    } finally { setLoading(false); }
  }

  return (
    <div style={{
      minHeight: '100dvh', width: '100vw',
      display: 'flex', background: 'var(--bg)',
      transition: 'background .25s',
      overflow: 'auto',
    }}>
      <BrandPanel />

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
            <SignupForm name={name} setName={setName} email={email} setEmail={setEmail}
              password={password} setPassword={setPassword} agree={agree} setAgree={setAgree}
              loading={loading} onSubmit={handleSignup} />
          ) : (
            <SigninForm loginEmail={loginEmail} setLoginEmail={setLoginEmail}
              loginPassword={loginPassword} setLoginPassword={setLoginPassword}
              loading={loading} onSubmit={handleLogin} />
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
