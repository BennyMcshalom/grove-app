'use client';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';

export function TopBar({ isLoading, isOwnProfile, firstName, showOverlap, setShowOverlap, onBack }: {
  isLoading: boolean; isOwnProfile: boolean; firstName: string;
  showOverlap: boolean; setShowOverlap: (fn: (s: boolean) => boolean) => void;
  onBack: () => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '.6rem', padding: '1.2rem clamp(1rem, 4vw, 1.6rem)' }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: '.4rem', color: 'var(--ink-3)', fontSize: '.9rem', flexShrink: 0 }}>
        <Icon name="back" size={18} stroke="var(--ink-3)" /> Back
      </button>
      <div className="label-mono" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.5rem',
        flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
      }}>
        {isLoading ? <Spinner size={12} /> : isOwnProfile ? (
          <span style={{ color: 'var(--ember)', fontWeight: 600 }}>This is your Grouv</span>
        ) : (
          <><span>You're inside</span> <span style={{ color: 'var(--ember)', fontWeight: 600 }}>{firstName}'s Grouv</span></>
        )}
      </div>
      {!isOwnProfile && (
        <button onClick={() => setShowOverlap(s => !s)} className="chip"
          style={{ cursor: 'pointer', flexShrink: 0, background: showOverlap ? 'var(--ember-dim)' : 'var(--surf-high)', color: showOverlap ? 'var(--ember-deep)' : 'var(--ink-2)' }}>
          <Icon name="dots" size={14} stroke={showOverlap ? 'var(--ember-deep)' : 'var(--ink-2)'} sw={2} /> Overlap
        </button>
      )}
    </div>
  );
}
