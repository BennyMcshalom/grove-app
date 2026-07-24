import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import type { AdminRelatedAccount } from '@/lib/api';
import { STATUS_BG, STATUS_COLOR } from './constants';

// ── Related accounts (passive ban-evasion signal) ──
export function RelatedAccounts({ accounts, onSelect }: {
  accounts: AdminRelatedAccount[];
  onSelect: (userId: string) => void;
}) {
  return (
    <div className="card" style={{ padding: '1.2rem 1.3rem', marginBottom: '1.1rem', border: '1px solid var(--amber-bdr)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.4rem' }}>
        <Icon name="eye" size={14} stroke="var(--amber)"/>
        <div className="label-mono" style={{ color: 'var(--amber)' }}>Possibly related accounts</div>
      </div>
      <p style={{ fontSize: '.8rem', color: 'var(--ink-3)', marginBottom: '.8rem', lineHeight: 1.5 }}>
        These accounts have logged in from the same IP at least once. Could be a shared
        network, a VPN, or a family member, not proof on its own.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
        {accounts.map(r => (
          <button key={r.userId} onClick={() => onSelect(r.userId)}
            style={{ display: 'flex', alignItems: 'center', gap: '.7rem', padding: '.6rem .8rem', textAlign: 'left',
              width: '100%', borderRadius: 'var(--r-md)', background: 'var(--surf-low)' }}>
            <Avatar name={r.displayName ?? r.email ?? '?'} size={32} avatarUrl={r.avatarUrl}/>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: '.84rem' }}>{r.displayName ?? 'Unnamed'}</div>
              <div style={{ fontSize: '.72rem', color: 'var(--ink-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {r.email}
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              {r.status && (
                <span className="chip" style={{ background: STATUS_BG[r.status], color: STATUS_COLOR[r.status], fontSize: '.62rem', textTransform: 'capitalize' }}>
                  {r.status}
                </span>
              )}
              <div style={{ fontSize: '.68rem', color: 'var(--ink-4)', marginTop: '.25rem' }}>
                {r.sharedIpCount} shared IP{r.sharedIpCount > 1 ? 's' : ''}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
