'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { AdminSubNav } from '@/components/admin/AdminSubNav';
import { useToastStore } from '@/store/useToastStore';
import { useAdminUsers } from '@/hooks/useAdmin';
import { adminApi, ApiError, type UserStatus } from '@/lib/api';

const PAGE_SIZE = 20;

const STATUS_COLOR: Record<UserStatus, string> = {
  active: 'var(--green)', suspended: 'var(--amber)', banned: 'var(--red)',
};
const STATUS_BG: Record<UserStatus, string> = {
  active: 'var(--green-dim)', suspended: 'var(--amber-dim)', banned: 'var(--red-dim)',
};

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
      <span style={{ fontSize: '.7rem', color: 'var(--ink-4)', fontWeight: 500, flexShrink: 0 }}>{label}</span>
      <div style={{ display: 'flex', gap: '.4rem' }}>{children}</div>
    </div>
  );
}

export default function AdminUsersPage() {
  const router = useRouter();
  const { toast } = useToastStore();
  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<UserStatus | 'all'>('all');
  const [role, setRole] = useState<'admin' | 'moderator' | 'user' | 'all'>('all');
  const [page, setPage] = useState(0);
  const [exporting, setExporting] = useState(false);

  // Small inline debounce — avoids firing an ILIKE scan on every keystroke
  useEffect(() => {
    const t = setTimeout(() => { setQ(qInput); setPage(0); }, 300);
    return () => clearTimeout(t);
  }, [qInput]);

  const filters = {
    q: q || undefined,
    status: status === 'all' ? undefined : status,
    role: role === 'all' ? undefined : role,
  };

  const { data, isLoading } = useAdminUsers({ limit: PAGE_SIZE, offset: page * PAGE_SIZE, ...filters });

  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  async function handleExport() {
    setExporting(true);
    try {
      const blob = await adminApi.exportUsersCsv(filters);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `grouw-users-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Could not export users.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <AppShell title="Users">
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 1.6rem 3rem' }}>
        <AdminSubNav/>

        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
          marginTop: '-.4rem', marginBottom: '1.2rem', gap: '.8rem', flexWrap: 'wrap' }}>
          <p style={{ color: 'var(--ink-3)', fontSize: '.88rem' }}>
            {total} {total === 1 ? 'account' : 'accounts'}.
          </p>
          <button onClick={handleExport} disabled={exporting} className="btn btn-soft"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '.4rem', fontSize: '.8rem' }}>
            {exporting ? <Spinner size={13}/> : <Icon name="book" size={14} stroke="var(--ink-2)"/>} Export CSV
          </button>
        </div>

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
              <button key={s} onClick={() => { setStatus(s); setPage(0); }} className="chip"
                style={{ cursor: 'pointer', background: status === s ? 'var(--ember)' : 'var(--surf-high)',
                  color: status === s ? '#fff' : 'var(--ink-2)', fontWeight: 500, textTransform: 'capitalize' }}>
                {s}
              </button>
            ))}
          </FilterGroup>
          <FilterGroup label="Role">
            {(['all', 'admin', 'moderator', 'user'] as const).map(r => (
              <button key={r} onClick={() => { setRole(r); setPage(0); }} className="chip"
                style={{ cursor: 'pointer', background: role === r ? 'var(--slate)' : 'var(--surf-high)',
                  color: role === r ? '#fff' : 'var(--ink-2)', fontWeight: 500, textTransform: 'capitalize' }}>
                {r === 'all' ? 'Any' : r}
              </button>
            ))}
          </FilterGroup>
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><Spinner/></div>
        ) : !data?.users.length ? (
          <EmptyState variant="groups" title="No matching accounts." body="Try a different search or filter."/>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem', marginBottom: '1.4rem' }}>
            {data.users.map(u => (
              <button key={u.id} onClick={() => router.push(`/admin/users/${u.id}`)} className="card"
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
                  <div style={{ fontSize: '.68rem', color: 'var(--ink-4)', marginTop: '.3rem', fontFamily: 'var(--font-dm-mono, DM Mono)' }}>
                    {new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
                <Icon name="arrow" size={14} stroke="var(--ink-4)"/>
              </button>
            ))}
          </div>
        )}

        {!isLoading && total > PAGE_SIZE && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
            <button className="btn btn-soft" disabled={page === 0} onClick={() => setPage(p => p - 1)}
              style={{ opacity: page === 0 ? .4 : 1, fontSize: '.82rem' }}>
              ← Prev
            </button>
            <span style={{ fontSize: '.8rem', color: 'var(--ink-3)' }}>Page {page + 1} of {pageCount}</span>
            <button className="btn btn-soft" disabled={page >= pageCount - 1} onClick={() => setPage(p => p + 1)}
              style={{ opacity: page >= pageCount - 1 ? .4 : 1, fontSize: '.82rem' }}>
              Next →
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
