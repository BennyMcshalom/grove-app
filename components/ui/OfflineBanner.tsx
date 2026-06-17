'use client';
import { useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { retrySession } from '@/components/AuthInitializer';
import { Icon } from '@/components/ui/Icon';

export function OfflineBanner() {
  const apiUnreachable = useAuthStore(s => s.apiUnreachable);
  const [retrying, setRetrying] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [wasUnreachable, setWasUnreachable] = useState(apiUnreachable);

  // Re-arm the banner the next time a connection failure happens (adjusting
  // state during render, per https://react.dev/learn/you-might-not-need-an-effect)
  if (apiUnreachable !== wasUnreachable) {
    setWasUnreachable(apiUnreachable);
    if (apiUnreachable) setDismissed(false);
  }

  if (!apiUnreachable || dismissed) return null;

  async function handleRetry() {
    setRetrying(true);
    await retrySession();
    setRetrying(false);
  }

  return (
    <div className="offline-banner rise" role="alert">
      <div className="offline-banner-icon">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </div>

      <div className="offline-banner-body">
        <div className="offline-banner-title">Can&apos;t reach the server</div>
        <p className="offline-banner-desc">
          Some features won&apos;t work until the connection is back.
        </p>
        <div className="offline-banner-actions">
          <button
            onClick={handleRetry}
            disabled={retrying}
            className="btn btn-pill"
            style={{
              background: 'var(--amber)', color: '#fff',
              padding: '.5rem 1.1rem', fontSize: '.82rem',
              opacity: retrying ? .7 : 1,
            }}
          >
            {retrying ? 'Checking…' : 'Try again'}
          </button>
        </div>
      </div>

      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        style={{
          flexShrink: 0, width: 26, height: 26, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--ink-4)', marginTop: -2, marginRight: -4,
        }}
      >
        <Icon name="close" size={14} sw={2}/>
      </button>
    </div>
  );
}
