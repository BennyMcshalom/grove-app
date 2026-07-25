'use client';
import { Icon } from '@/components/ui/Icon';
import type { GroveData } from '@/lib/api';

export function OverlapPanel({ activeSpaces }: { activeSpaces: GroveData['activeSpaces'] | undefined }) {
  return (
    <div className="card fade-in" style={{ padding: '1.2rem 1.4rem', background: 'var(--ember-dim)', border: '1px solid var(--ember-bdr)' }}>
      <div className="label-mono" style={{ color: 'var(--ember-deep)', marginBottom: '.4rem', display: 'flex', alignItems: 'center', gap: '.4rem' }}>
        <Icon name="dots" size={12} stroke="var(--ember-deep)" sw={2} /> Where your Grouvs overlap
      </div>
      {activeSpaces?.length ? (
        <p style={{ color: 'var(--ink-2)', lineHeight: 1.55, fontSize: '.92rem' }}>
          You're both navigating{' '}
          {activeSpaces.slice(0, 2).map(s => s.space?.name).filter(Boolean).join(' and ')}.
        </p>
      ) : (
        <p style={{ color: 'var(--ink-3)', fontStyle: 'italic', fontSize: '.92rem' }}>No shared spaces found yet.</p>
      )}
    </div>
  );
}
