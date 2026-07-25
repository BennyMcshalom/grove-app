'use client';
import { Icon } from '@/components/ui/Icon';
import { STAGES } from '@/lib/data';
import type { Space } from '@/lib/types';

export function SpaceDirectoryCard({ s, isOpening, chapter, setChapter, submitting,
  onStartOpen, onCancel, onSubmit }: {
  s: Space;
  isOpening: boolean;
  chapter: string; setChapter: (v: string) => void;
  submitting: boolean;
  onStartOpen: () => void; onCancel: () => void; onSubmit: () => void;
}) {
  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div style={{ height: 88, background: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={s.icon} size={32} stroke={s.ink} sw={1.6}/>
      </div>
      <div style={{ padding: '1rem 1.1rem' }}>
        <div className="serif" style={{ fontSize: '1.2rem', fontWeight: 600 }}>{s.name}</div>
        <div style={{ fontSize: '.82rem', color: 'var(--ink-3)', marginBottom: '.8rem' }}>{s.desc}</div>
        {isOpening ? (
          <div className="fade-in">
            <div className="label-mono" style={{ marginBottom: '.4rem' }}>Name your chapter</div>
            <input autoFocus value={chapter} onChange={e => setChapter(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') onSubmit(); }}
              placeholder={`e.g. ${(STAGES[s.id] ?? ['Just starting'])[0]}`}
              style={{ width: '100%', padding: '.6rem .8rem', fontSize: '.88rem', background: 'var(--surf-low)',
                border: '1.5px solid var(--border-2)', borderRadius: 'var(--r-md)', marginBottom: '.5rem' }}
              onFocus={e => { e.target.style.borderColor = 'var(--ember)'; }}
              onBlur={e => { e.target.style.borderColor = 'var(--border-2)'; }}/>
            <div style={{ display: 'flex', gap: '.4rem' }}>
              <button onClick={onSubmit} disabled={submitting}
                className="btn btn-primary" style={{ flex: 1, padding: '.45rem', fontSize: '.82rem' }}>
                {submitting ? '…' : 'Open chapter'}
              </button>
              <button onClick={onCancel}
                className="btn btn-soft" style={{ padding: '.45rem .7rem', fontSize: '.82rem' }}>Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={onStartOpen}
            className="btn btn-ghost" style={{ padding: '.4rem .9rem', fontSize: '.82rem' }}>Join</button>
        )}
      </div>
    </div>
  );
}
