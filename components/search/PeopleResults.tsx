'use client';
import { useRouter } from 'next/navigation';
import { Avatar } from '@/components/ui/Avatar';
import type { SearchResults } from '@/lib/api';

export function PeopleResults({ users, showLabel }: { users: SearchResults['users']; showLabel: boolean }) {
  const router = useRouter();

  return (
    <section>
      {showLabel && <div className="label-mono" style={{ marginBottom: '.8rem' }}>People</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
        {users.map(u => (
          <div key={u.id} className="card" style={{ padding: '.9rem 1.1rem', display: 'flex', alignItems: 'center', gap: '.8rem', boxShadow: 'var(--shadow-soft)' }}>
            <button onClick={() => router.push(`/grove/${u.id}`)}>
              <Avatar name={u.displayName} size={44} avatarUrl={u.avatarUrl} aura={u.aura ?? undefined} />
            </button>
            <button onClick={() => router.push(`/grove/${u.id}`)}
              style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
              <div style={{ fontWeight: 600 }}>{u.displayName}</div>
              {u.openTo && <div style={{ fontSize: '.78rem', color: 'var(--ink-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.openTo}</div>}
            </button>
            <button onClick={() => router.push(`/grove/${u.id}`)}
              className="btn btn-ghost" style={{ padding: '.4rem .9rem', fontSize: '.8rem' }}>
              View Grouv
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
