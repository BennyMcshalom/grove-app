'use client';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';


export function RecordingBar({ elapsed, onSend, onCancel, sending }: {
  elapsed: number; onSend: () => void; onCancel: () => void; sending: boolean;
}) {
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '.75rem',
      background: 'var(--surf-low)', border: '1.5px solid var(--border-2)',
      borderRadius: 100, padding: '.5rem .5rem .5rem .9rem'
    }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: '.5rem', flex: 1 }}>
        <span style={{
          width: 9, height: 9, borderRadius: '50%', background: 'var(--red)',
          animation: 'pulseDot 1s ease infinite', display: 'block', flexShrink: 0
        }} />
        <span style={{
          fontSize: '.84rem', color: 'var(--ink-2)', fontWeight: 500,
          fontFamily: 'inherit'
        }}>
          {fmt(elapsed)}
        </span>
        <span style={{ flex: 1, height: 3, background: 'var(--border-2)', borderRadius: 2, overflow: 'hidden' }}>
          <span style={{
            display: 'block', height: '100%', background: 'var(--ember)', borderRadius: 2,
            width: `${Math.min(elapsed / 120 * 100, 100)}%`, transition: 'width 1s linear'
          }} />
        </span>
      </span>
      <button onClick={onCancel} style={{
        width: 38, height: 38, borderRadius: '50%',
        background: 'var(--red-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
      }}>
        <Icon name="close" size={16} stroke="var(--red)" />
      </button>
      <button onClick={onSend} disabled={sending} style={{
        width: 38, height: 38, borderRadius: '50%',
        background: 'var(--ember)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        boxShadow: '0 2px 10px -2px rgba(243,112,30,.5)'
      }}>
        {sending ? <Spinner size={14} color="#fff" /> : <Icon name="send" size={16} stroke="#fff" />}
      </button>
    </div>
  );
}
