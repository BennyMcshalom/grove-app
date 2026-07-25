'use client';
import { Spinner } from '@/components/ui/Spinner';
import type { GroveData } from '@/lib/api';
import type { Ring } from './rings';

export function RingDetailPanel({ active, rings, getRingContent, chapter, isOwnProfile, primarySpace,
  editingRing, setEditingRing, ringDraft, setRingDraft, savingRing, stageOptions,
  hasntFilled, firstName, onStartEditRing, onSaveRing, onSelectRing }: {
  active: string | null;
  rings: Ring[];
  getRingContent: (key: 'inner' | 'middle' | 'outer') => string | null;
  chapter: GroveData['closedChapters'][number] | undefined;
  isOwnProfile: boolean;
  primarySpace: GroveData['activeSpaces'][number] | undefined;
  editingRing: boolean; setEditingRing: (v: boolean) => void;
  ringDraft: string; setRingDraft: (v: string) => void;
  savingRing: boolean;
  stageOptions: readonly string[];
  hasntFilled: string;
  firstName: string;
  onStartEditRing: () => void; onSaveRing: () => void; onSelectRing: (key: string | null) => void;
}) {
  if (!active) {
    return (
      <div className="card" style={{ padding: '1.3rem 1.4rem', background: 'linear-gradient(160deg, var(--white), var(--surf-low))' }}>
        <p style={{ color: 'var(--ink-2)', lineHeight: 1.6, fontSize: '.95rem' }}>
          {isOwnProfile
            ? "You're standing in the middle of your own Grouv."
            : `You're standing in the middle of ${firstName}'s Grouv.`} Each ring is a layer of where {isOwnProfile ? 'you are' : 'they are'},{' '}
          <span style={{ color: 'var(--ring-struggling)' }}>struggling</span>, <span style={{ color: 'var(--ember)' }}>building</span>,{' '}
          <span style={{ color: 'var(--sage)' }}>open to</span>. Step into one.
        </p>
      </div>
    );
  }

  const ring = rings.find(r => r.key === active)!;
  const content = getRingContent(active as 'inner' | 'middle' | 'outer');
  const chapterLearning = active === 'inner' && chapter?.closingLearned;
  const canEditRing = isOwnProfile && (ring.field !== 'building' || !!primarySpace);

  return (
    <div className="card fade-in" style={{ padding: '1.3rem 1.4rem', borderLeft: `4px solid ${ring.color}` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.5rem' }}>
        <div className="label-mono" style={{ color: ring.color }}>{ring.label}</div>
        {canEditRing && !editingRing && (
          <button onClick={onStartEditRing} style={{ fontSize: '.78rem', color: 'var(--ember)', fontWeight: 500 }}>Edit</button>
        )}
      </div>

      {editingRing ? (
        <div style={{ marginBottom: '1rem' }}>
          {ring.field === 'building' ? (
            <select value={ringDraft} onChange={e => setRingDraft(e.target.value)} autoFocus
              style={{
                width: '100%', padding: '.6rem .7rem', fontSize: '.92rem', fontFamily: 'inherit',
                border: '1.5px solid var(--ember)', borderRadius: 'var(--r-md)', background: 'var(--surf-low)'
              }}>
              {stageOptions.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : (
            <textarea autoFocus value={ringDraft} onChange={e => setRingDraft(e.target.value)} maxLength={300}
              placeholder="Only your Bonds will see this…"
              style={{
                width: '100%', minHeight: 80, resize: 'vertical', padding: '.6rem .7rem', fontSize: '.92rem',
                fontFamily: 'inherit', lineHeight: 1.5, border: '1.5px solid var(--ember)', borderRadius: 'var(--r-md)',
                background: 'var(--surf-low)'
              }} />
          )}
          <div style={{ display: 'flex', gap: '.5rem', marginTop: '.6rem' }}>
            <button onClick={onSaveRing} disabled={savingRing} className="btn btn-primary"
              style={{ padding: '.35rem .8rem', fontSize: '.8rem' }}>
              {savingRing ? <Spinner size={12} color="#fff" /> : 'Save'}
            </button>
            <button onClick={() => setEditingRing(false)} disabled={savingRing} className="btn btn-soft"
              style={{ padding: '.35rem .8rem', fontSize: '.8rem' }}>Cancel</button>
          </div>
        </div>
      ) : content ? (
        <p className="serif" style={{ fontSize: '1.3rem', fontWeight: 600, lineHeight: 1.3, marginBottom: '1rem' }}>"{content}"</p>
      ) : (
        <p style={{ color: 'var(--ink-3)', fontStyle: 'italic', marginBottom: '1rem' }}>
          {hasntFilled}
        </p>
      )}
      {chapterLearning && (
        <>
          <div className="label-mono" style={{ marginBottom: '.6rem' }}>What they learned in this chapter</div>
          <div style={{ background: 'var(--surf-low)', borderRadius: 'var(--r-md)', padding: '.7rem .9rem', fontSize: '.88rem', color: 'var(--ink-2)', fontStyle: 'italic' }}>
            "{chapter.closingLearned}"
          </div>
        </>
      )}
      <button onClick={() => onSelectRing(null)} style={{ marginTop: '1rem', fontSize: '.8rem', color: 'var(--ink-3)' }}>← Step back out</button>
    </div>
  );
}
