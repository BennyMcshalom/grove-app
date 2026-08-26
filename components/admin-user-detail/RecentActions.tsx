import type { AdminAuditEntry } from '@/lib/api';
import { ACTION_LABEL } from './constants';

// ── Recent actions on this account ──
export function RecentActions({ entries }: { entries: AdminAuditEntry[] }) {
  return (
    <div>
      <div className="label-mono" style={{ marginBottom: '.7rem' }}>Recent actions</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
        {entries.map(a => (
          <div key={a.id} className="card" style={{ padding: '.7rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: 'var(--shadow-soft)' }}>
            <div style={{ fontSize: '.82rem' }}>
              {ACTION_LABEL[a.action] ?? a.action}
              {a.reason && <span style={{ color: 'var(--ink-3)' }}>, &ldquo;{a.reason}&rdquo;</span>}
            </div>
            <div style={{ fontSize: '.7rem', color: 'var(--ink-4)', flexShrink: 0, fontFamily: 'inherit' }}>
              {new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
