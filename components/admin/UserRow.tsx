'use client';
import { useRouter } from 'next/navigation';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import type { AdminUserRow, UserStatus } from '@/lib/api';

const STATUS_COLOR: Record<UserStatus, string> = {
  active: 'var(--green)', suspended: 'var(--amber)', banned: 'var(--red)',
};
const STATUS_BG: Record<UserStatus, string> = {
  active: 'var(--green-dim)', suspended: 'var(--amber-dim)', banned: 'var(--red-dim)',
};

export function UserRow({ u }: { u: AdminUserRow }) {
  const router = useRouter();

  return (
    <button onClick={() => router.push(`/admin/users/${u.id}`)} className="card"
      style={{ display: 'flex', alignItems: 'center', gap: '.8rem', padding: '.8rem 1.1rem', textAlign: 'left', width: '100%',
        borderLeft: `3px solid ${STATUS_COLOR[u.status]}` }}>
      <Avatar name={u.displayName ?? u.email} size={38} avatarUrl={u.avatarUrl}/>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
          <span style={{ fontWeight: 600, fontSize: '.88rem' }}>{u.displayName ?? 'Unnamed'}</span>
          {u.roles.includes('admin') && (
            <span className="chip" style={{ background: 'var(--slate-dim)', color: 'var(--slate)', fontSize: '.62rem', padding: '.1rem .5rem' }}>
              Admin
            </span>
          )}
          {u.roles.includes('moderator') && (
            <span className="chip" style={{ background: 'var(--amber-dim)', color: 'var(--amber)', fontSize: '.62rem', padding: '.1rem .5rem' }}>
              Moderator
            </span>
          )}
        </div>
        <div style={{ fontSize: '.76rem', color: 'var(--ink-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {u.email}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <span className="chip" style={{ background: STATUS_BG[u.status], color: STATUS_COLOR[u.status], fontSize: '.68rem', textTransform: 'capitalize' }}>
          {u.status}
        </span>
        <div style={{ fontSize: '.68rem', color: 'var(--ink-4)', marginTop: '.3rem', fontFamily: 'inherit' }}>
          {new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
      </div>
      <Icon name="arrow" size={14} stroke="var(--ink-4)"/>
    </button>
  );
}
