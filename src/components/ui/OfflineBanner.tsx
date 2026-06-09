'use client';
import { useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { retrySession } from '@/components/AuthInitializer';

export function OfflineBanner() {
  const apiUnreachable = useAuthStore(s => s.apiUnreachable);
  const [retrying, setRetrying] = useState(false);

  if (!apiUnreachable) return null;

  async function handleRetry() {
    setRetrying(true);
    await retrySession();
    setRetrying(false);
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9900,
      background: 'var(--amber-soft)',
      borderBottom: '1px solid var(--amber)',
      padding: '.55rem 1.2rem',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.8rem',
      fontSize: '.82rem', color: 'var(--amber)',
      fontWeight: 500,
    }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        Can't reach the server right now.
      </span>
      <button
        onClick={handleRetry}
        disabled={retrying}
        style={{
          fontSize: '.78rem', fontWeight: 600,
          color: 'var(--amber)', textDecoration: 'underline',
          opacity: retrying ? .5 : 1, cursor: retrying ? 'default' : 'pointer',
          background: 'none', border: 'none', padding: 0,
        }}
      >
        {retrying ? 'Retrying…' : 'Try again'}
      </button>
    </div>
  );
}
