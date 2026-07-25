'use client';

type LogPreviewEntry = { date: string; mediaUrl: string | null; body: string };

export function GroveLogPanel({ possessiveCap, entries, isLoading, logVisible, hasntPosted, isOwnProfile, onViewLog }: {
  possessiveCap: string;
  entries: LogPreviewEntry[];
  isLoading: boolean;
  logVisible: boolean;
  hasntPosted: string;
  isOwnProfile: boolean;
  onViewLog: () => void;
}) {
  return (
    <div className="card" style={{ padding: '1.1rem 1.2rem' }}>
      <div className="label-mono" style={{ marginBottom: '.7rem' }}>{possessiveCap} Grouv Log</div>
      {entries.length > 0 ? (
        <div className="scroll" style={{ display: 'flex', gap: '.5rem', overflowX: 'auto', marginBottom: '.7rem' }}>
          {entries.map((e, i) => (
            <button key={i} onClick={onViewLog}
              style={{ flexShrink: 0, width: 96, borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-soft)' }}>
              <div style={{ height: 120, position: 'relative', background: 'var(--surf-high)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {e.mediaUrl ? (
                  <>
                    <img src={e.mediaUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 50%, rgba(20,14,8,.75))' }} />
                  </>
                ) : (
                  <span style={{ fontSize: '.65rem', color: 'var(--ink-3)', padding: '.3rem', textAlign: 'center', lineHeight: 1.4 }}>
                    {e.body.slice(0, 40)}…
                  </span>
                )}
                <span className="mono" style={{ position: 'absolute', left: 6, bottom: 5, color: e.mediaUrl ? '#fff' : 'var(--ink-3)', fontSize: '.58rem' }}>{e.date}</span>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <p style={{ fontSize: '.83rem', color: 'var(--ink-4)', fontStyle: 'italic', marginBottom: '.7rem' }}>
          {isLoading
            ? 'Loading…'
            : !logVisible
              ? `${possessiveCap} Grouv Log is private.`
              : hasntPosted}
        </p>
      )}
      <button onClick={onViewLog} disabled={entries.length === 0}
        className="btn btn-soft btn-block" style={{ fontSize: '.85rem' }}>
        {isOwnProfile ? 'Scroll your log →' : 'Scroll their log →'}
      </button>
    </div>
  );
}
