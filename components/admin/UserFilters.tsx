'use client';
import clsx from 'clsx';
import { Icon } from '@/components/ui/Icon';
import type { UserStatus } from '@/lib/api';
import styles from './UserFilters.module.css';

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={styles.filterGroup}>
      <span className={styles.filterLabel}>{label}</span>
      <div className={styles.filterOptions}>{children}</div>
    </div>
  );
}

export function UserFilters({ qInput, setQInput, status, setStatus, role, setRole }: {
  qInput: string; setQInput: (v: string) => void;
  status: UserStatus | 'all'; setStatus: (s: UserStatus | 'all') => void;
  role: 'admin' | 'moderator' | 'user' | 'all'; setRole: (r: 'admin' | 'moderator' | 'user' | 'all') => void;
}) {
  return (
    <div className={clsx('card', styles.bar)}>
      <div className={styles.searchWrap}>
        <span className={styles.searchIcon}>
          <Icon name="search" size={15} stroke="var(--ink-4)"/>
        </span>
        <input value={qInput} onChange={e => setQInput(e.target.value)}
          placeholder="Search by name or email…"
          className={styles.searchInput}/>
      </div>
      <FilterGroup label="Status">
        {(['all', 'active', 'suspended', 'banned'] as const).map(s => (
          <button key={s} onClick={() => setStatus(s)}
            className={clsx('chip', styles.filterChip, status === s && styles.activeEmber)}>
            {s}
          </button>
        ))}
      </FilterGroup>
      <FilterGroup label="Role">
        {(['all', 'admin', 'moderator', 'user'] as const).map(r => (
          <button key={r} onClick={() => setRole(r)}
            className={clsx('chip', styles.filterChip, role === r && styles.active)}>
            {r === 'all' ? 'Any' : r}
          </button>
        ))}
      </FilterGroup>
    </div>
  );
}
