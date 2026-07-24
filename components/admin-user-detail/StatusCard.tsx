import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import type { UserStatus } from '@/lib/api';
import { STATUS_BG, STATUS_COLOR } from './constants';

// ── Status ──
export function StatusCard({ status, pendingStatus, setPendingStatus, reason, setReason,
  banConfirm, setBanConfirm, onApply, applying }: {
  status: UserStatus;
  pendingStatus: UserStatus | null;
  setPendingStatus: (s: UserStatus | null) => void;
  reason: string; setReason: (v: string) => void;
  banConfirm: string; setBanConfirm: (v: string) => void;
  onApply: (status: UserStatus) => void;
  applying: boolean;
}) {
  const needsTypeConfirm = pendingStatus === 'banned';
  const statusConfirmReady = !needsTypeConfirm || banConfirm === 'BAN';

  return (
    <div className="card" style={{ padding: '1.2rem 1.3rem', marginBottom: '1.1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.8rem' }}>
        <Icon name="shield" size={14} stroke="var(--ink-3)"/>
        <div className="label-mono">Account status</div>
      </div>
      <div style={{ display: 'flex', gap: '.5rem', marginBottom: pendingStatus && pendingStatus !== status ? '.9rem' : 0 }}>
        {(['active', 'suspended', 'banned'] as const).map(s => (
          <button key={s} onClick={() => setPendingStatus(s)} className="chip"
            style={{ cursor: 'pointer', flex: 1, justifyContent: 'center', padding: '.5rem', fontWeight: 600, textTransform: 'capitalize',
              background: (pendingStatus ?? status) === s ? STATUS_BG[s] : 'var(--surf-high)',
              color: (pendingStatus ?? status) === s ? STATUS_COLOR[s] : 'var(--ink-3)',
              border: status === s ? `1.5px solid ${STATUS_COLOR[s]}` : '1.5px solid transparent',
              transition: 'all .15s' }}>
            {s}
          </button>
        ))}
      </div>

      {pendingStatus && pendingStatus !== status && (
        <div className="fade-in">
          {pendingStatus !== 'active' && (
            <textarea value={reason} onChange={e => setReason(e.target.value)}
              placeholder="Reason (shown to the user on login)…"
              style={{ width: '100%', minHeight: 60, padding: '.7rem .85rem', fontSize: '.86rem',
                border: '1px solid var(--border-2)', borderRadius: 'var(--r-sm)', marginBottom: '.7rem', resize: 'vertical' }}/>
          )}
          {needsTypeConfirm && (
            <input value={banConfirm} onChange={e => setBanConfirm(e.target.value.toUpperCase())}
              placeholder='Type "BAN" to confirm'
              style={{ width: '100%', padding: '.6rem .85rem', fontSize: '.84rem', marginBottom: '.7rem',
                border: '1.5px solid var(--red-bdr)', borderRadius: 'var(--r-sm)', background: 'var(--red-dim)' }}/>
          )}
          <div style={{ display: 'flex', gap: '.5rem' }}>
            <button className="btn btn-soft" style={{ fontSize: '.82rem', padding: '.5rem .9rem' }}
              onClick={() => { setPendingStatus(null); setReason(''); setBanConfirm(''); }}>
              Cancel
            </button>
            <button disabled={!statusConfirmReady || applying}
              onClick={() => onApply(pendingStatus)}
              style={{ padding: '.5rem 1rem', borderRadius: 'var(--r-md)', fontSize: '.84rem', fontWeight: 600,
                background: statusConfirmReady ? STATUS_COLOR[pendingStatus] : 'var(--surf-high)',
                color: statusConfirmReady ? '#fff' : 'var(--ink-4)', opacity: applying ? .7 : 1 }}>
              {applying ? <Spinner size={14} color="#fff"/> : `Confirm ${pendingStatus}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
