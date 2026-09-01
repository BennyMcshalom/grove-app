'use client';
import clsx from 'clsx';
import { useRouter } from 'next/navigation';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import type { AdminUserRow, UserStatus } from '@/lib/api';
import styles from './UserRow.module.css';

const STATUS_COLOR: Record<UserStatus, string> = {
  active: 'var(--green)', suspended: 'var(--amber)', banned: 'var(--red)',
};

export function UserRow({ u }: { u: AdminUserRow }) {
  const router = useRouter();

  return (
    <button onClick={() => router.push(`/admin/users/${u.id}`)}
      className={clsx('card', styles.row)}
      style={{ borderLeft: `3px solid ${STATUS_COLOR[u.status]}` }}>
      <Avatar name={u.displayName ?? u.email} size={38} avatarUrl={u.avatarUrl}/>
      <div className={styles.info}>
        <div className={styles.nameLine}>
          <span className={styles.name}>{u.displayName ?? 'Unnamed'}</span>
          {u.roles.includes('admin') && (
            <span className={clsx('chip', styles.roleChip, styles.admin)}>
              Admin
            </span>
          )}
          {u.roles.includes('moderator') && (
            <span className={clsx('chip', styles.roleChip, styles.moderator)}>
              Moderator
            </span>
          )}
        </div>
        <div className={styles.email}>
          {u.email}
        </div>
      </div>
      <div className={styles.meta}>
        <span className={clsx('chip', styles.statusChip, styles[u.status])}>
          {u.status}
        </span>
        <div className={styles.date}>
          {new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
      </div>
      <Icon name="arrow" size={14} stroke="var(--ink-4)"/>
    </button>
  );
}
