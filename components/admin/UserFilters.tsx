'use client';
import { Icon } from '@/components/ui/Icon';
import type { UserStatus } from '@/lib/api';

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
      <span style={{ fontSize: '.7rem', color: 'var(--ink-4)', fontWeight: 500, flexShrink: 0 }}>{label}</span>
      <div style={{ display: 'flex', gap: '.4rem' }}>{children}</div>
    </div>
  );
}

export function UserFilters({ qInput, setQInput, status, setStatus, role, setRole }: {
  qInput: string; setQInput: (v: string) => void;
  status: UserStatus | 'all'; setStatus: (s: UserStatus | 'all') => void;
  role: 'admin' | 'moderator' | 'user' | 'all'; setRole: (r: 'admin' | 'moderator' | 'user' | 'all') => void;
}) {
  return (
    <div className="card" style={{ padding: '1rem 1.1rem', marginBottom: '1.2rem',
      display: 'flex', gap: '.9rem', flexWrap: 'wrap', alignItems: 'center' }}>
      <div style={{ position: 'relative', flex: '1 1 220px' }}>
        <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)' }}>
          <Icon name="search" size={15} stroke="var(--ink-4)"/>
        </span>
        <input value={qInput} onChange={e => setQInput(e.target.value)}
          placeholder="Search by name or email…"
          style={{ width: '100%', padding: '.6rem .9rem .6rem 2.2rem', borderRadius: 100,
            border: '1.5px solid var(--border-2)', background: 'var(--surf-low)', fontSize: '.86rem' }}/>
      </div>
      <FilterGroup label="Status">
        {(['all', 'active', 'suspended', 'banned'] as const).map(s => (
          <button key={s} onClick={() => setStatus(s)} className="chip"
            style={{ cursor: 'pointer', background: status === s ? 'var(--ember)' : 'var(--surf-high)',
              color: status === s ? '#fff' : 'var(--ink-2)', fontWeight: 500, textTransform: 'capitalize' }}>
            {s}
          </button>
        ))}
      </FilterGroup>
      <FilterGroup label="Role">
        {(['all', 'admin', 'moderator', 'user'] as const).map(r => (
          <button key={r} onClick={() => setRole(r)} className="chip"
            style={{ cursor: 'pointer', background: role === r ? 'var(--slate)' : 'var(--surf-high)',
              color: role === r ? '#fff' : 'var(--ink-2)', fontWeight: 500, textTransform: 'capitalize' }}>
            {r === 'all' ? 'Any' : r}
          </button>
        ))}
      </FilterGroup>
    </div>
  );
}
