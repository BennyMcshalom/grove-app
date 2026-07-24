import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';

export function RoleCard({ icon, label, description, granted, onToggle, pending, grantLabel, revokeLabel }: {
  icon: string; label: string; description: string;
  granted: boolean; onToggle: () => void; pending: boolean;
  grantLabel: string; revokeLabel: string;
}) {
  return (
    <div className="card" style={{ padding: '1.2rem 1.3rem', marginBottom: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.3rem' }}>
          <Icon name={icon} size={13} stroke="var(--ink-3)"/>
          <div className="label-mono">{label}</div>
        </div>
        <p style={{ fontSize: '.82rem', color: 'var(--ink-3)' }}>{description}</p>
      </div>
      <button disabled={pending} onClick={onToggle} className={granted ? 'btn btn-soft' : 'btn btn-primary'}
        style={{ fontSize: '.82rem', flexShrink: 0 }}>
        {pending ? <Spinner size={14}/> : granted ? revokeLabel : grantLabel}
      </button>
    </div>
  );
}
