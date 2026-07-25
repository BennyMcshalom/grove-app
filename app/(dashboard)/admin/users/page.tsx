'use client';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { AdminSubNav } from '@/components/admin/AdminSubNav';
import { UserFilters } from '@/components/admin/UserFilters';
import { UserRow } from '@/components/admin/UserRow';
import { Pagination } from '@/components/admin/Pagination';
import { useToastStore } from '@/store/useToastStore';
import { useAdminUsers } from '@/hooks/useAdmin';
import { adminApi, ApiError, type UserStatus } from '@/lib/api';

const PAGE_SIZE = 20;

export default function AdminUsersPage() {
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
        <AdminSubNav />

        <div style={{
          display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
          marginTop: '-.4rem', marginBottom: '1.2rem', gap: '.8rem', flexWrap: 'wrap'
        }}>
          <p style={{ color: 'var(--ink-3)', fontSize: '.88rem' }}>
            {total} {total === 1 ? 'account' : 'accounts'}.
          </p>
          <button onClick={handleExport} disabled={exporting} className="btn btn-soft"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '.4rem', fontSize: '.8rem' }}>
            {exporting ? <Spinner size={13} /> : <Icon name="book" size={14} stroke="var(--ink-2)" />} Export CSV
          </button>
        </div>

        <UserFilters qInput={qInput} setQInput={setQInput}
          status={status} setStatus={s => { setStatus(s); setPage(0); }}
          role={role} setRole={r => { setRole(r); setPage(0); }} />

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><Spinner /></div>
        ) : !data?.users.length ? (
          <EmptyState variant="groups" title="No matching accounts." body="Try a different search or filter." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem', marginBottom: '1.4rem' }}>
            {data.users.map(u => <UserRow key={u.id} u={u} />)}
          </div>
        )}

        {!isLoading && total > PAGE_SIZE && (
          <Pagination page={page} pageCount={pageCount}
            onPrev={() => setPage(p => p - 1)} onNext={() => setPage(p => p + 1)} />
        )}
      </div>
    </AppShell>
  );
}
