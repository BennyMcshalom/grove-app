'use client';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';

// ─────────────────────────────────────────────────────────────────
// VOICE RECORDER BAR
// ─────────────────────────────────────────────────────────────────
export function RecordingBar({ elapsed, onSend, onCancel, sending }: {
  elapsed: number; onSend: () => void; onCancel: () => void; sending: boolean;
}) {
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '.7rem',
      background: 'var(--surf-low)', borderRadius: 100, padding: '.5rem .8rem' }}>
      <button onClick={onCancel} style={{ width: 36, height: 36, borderRadius: '50%',
        background: 'var(--red-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon name="close" size={16} stroke="var(--red)"/>
      </button>
      <span style={{ display: 'flex', alignItems: 'center', gap: '.4rem', flex: 1 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--red)',
          animation: 'pulseDot 1s ease infinite', display: 'block', flexShrink: 0 }}/>
        <span style={{ fontSize: '.82rem', color: 'var(--ink-2)', fontFamily: 'DM Mono, monospace' }}>
          {fmt(elapsed)}
        </span>
        <span style={{ flex: 1, height: 2, background: 'var(--border-2)', borderRadius: 1, overflow: 'hidden' }}>
          <span style={{ display: 'block', height: '100%', background: 'var(--ember)',
            width: `${Math.min(elapsed / 120 * 100, 100)}%`, transition: 'width 1s linear' }}/>
        </span>
      </span>
      <button onClick={onSend} disabled={sending} className="btn btn-primary"
        style={{ padding: '.45rem .9rem', fontSize: '.82rem', borderRadius: 100, flexShrink: 0 }}>
        {sending ? <Spinner size={14} color="#fff"/> : 'Send'}
      </button>
    </div>
  );
}
