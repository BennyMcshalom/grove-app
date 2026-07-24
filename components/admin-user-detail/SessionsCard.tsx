import { Spinner } from '@/components/ui/Spinner';
import type { AdminSession } from '@/lib/api';
import { friendlyDevice, timeAgo } from './constants';

// ── Sessions ──
export function SessionsCard({ sessions, loading, onRevoke, revoking }: {
  sessions: AdminSession[] | undefined;
  loading: boolean;
  onRevoke: (sessionId: string) => void;
  revoking: boolean;
}) {
  return (
    <div className="card" style={{ padding: '1.2rem 1.3rem', marginBottom: '1.1rem' }}>
      <div className="label-mono" style={{ marginBottom: '.8rem' }}>Active sessions</div>
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem' }}><Spinner size={16}/></div>
      ) : !sessions?.length ? (
        <p style={{ fontSize: '.82rem', color: 'var(--ink-4)', fontStyle: 'italic' }}>No active sessions.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
          {sessions.map(s => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '.7rem', padding: '.65rem .8rem',
              borderRadius: 'var(--r-sm)', background: 'var(--surf-low)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '.82rem', fontWeight: 500 }}>{friendlyDevice(s.userAgent)}</div>
                <div style={{ fontSize: '.7rem', color: 'var(--ink-4)', marginTop: '.1rem' }}>
                  {s.ip ?? 'Unknown IP'} · started {timeAgo(s.createdAt)}
                </div>
              </div>
              <button onClick={() => onRevoke(s.id)} disabled={revoking}
                className="btn btn-soft" style={{ fontSize: '.74rem', padding: '.35rem .75rem', flexShrink: 0 }}>
                Log out
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
