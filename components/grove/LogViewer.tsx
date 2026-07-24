'use client';
import { Icon } from '@/components/ui/Icon';

export function LogViewer({ title, entries, onClose }: {
  title: string;
  entries: { date: string; mediaUrl: string | null; body: string }[];
  onClose: () => void;
}) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 7000, background: 'rgba(26,26,26,.5)',
      backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'flex-end'
    }}
      onClick={onClose}>
      <div className="scroll" style={{
        width: 'min(520px, 94vw)', height: '100%', background: 'var(--white)',
        overflowY: 'auto', animation: 'slideIn .3s ease both'
      }}
        onClick={e => e.stopPropagation()}>
        <div style={{
          position: 'sticky', top: 0, background: 'var(--white)', zIndex: 2,
          borderBottom: '1px solid var(--border)', padding: '1.1rem 1.4rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div className="label-mono">{title}</div>
          <button onClick={onClose} style={{
            width: 36, height: 36, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Icon name="close" stroke="var(--ink-3)" />
          </button>
        </div>
        <div style={{ padding: '1.4rem' }}>
          {entries.length === 0 && (
            <p style={{ color: 'var(--ink-3)', fontStyle: 'italic' }}>No log entries yet.</p>
          )}
          {entries.map((e, i) => (
            <article key={i} style={{
              marginBottom: '1.8rem', paddingBottom: '1.8rem',
              borderBottom: i < entries.length - 1 ? '1px solid var(--border)' : 'none'
            }}>
              <div className="label-mono" style={{ marginBottom: '.6rem' }}>Day {entries.length - i} · {e.date}</div>
              {e.mediaUrl && (
                <div style={{ borderRadius: 'var(--r-md)', overflow: 'hidden', marginBottom: '.8rem' }}>
                  <img src={e.mediaUrl} alt="" style={{ width: '100%', objectFit: 'cover', display: 'block', maxHeight: 240 }} />
                </div>
              )}
              <p className="serif" style={{ fontSize: '1.15rem', lineHeight: 1.5 }}>{e.body}</p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
