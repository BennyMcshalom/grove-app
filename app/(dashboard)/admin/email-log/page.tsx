'use client';
import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { AdminSubNav } from '@/components/admin/AdminSubNav';
import { useAdminEmailLog } from '@/hooks/useAdmin';

const PAGE_SIZE = 30;

export default function AdminEmailLogPage() {
  const [status, setStatus] = useState<'sent' | 'failed' | undefined>(undefined);
  const [page, setPage] = useState(0);
  const { data, isLoading } = useAdminEmailLog({ limit: PAGE_SIZE, offset: page * PAGE_SIZE, status });

  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <AppShell title="Email log">
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 1.6rem 3rem' }}>
        <AdminSubNav/>

        <p style={{ color: 'var(--ink-3)', fontSize: '.86rem', marginTop: '-.4rem', marginBottom: '1.2rem' }}>
          Every outbound email attempt, success or failure, so delivery problems show up here instead of requiring a support complaint first.
        </p>

        <div style={{ display: 'flex', gap: '.5rem', marginBottom: '1.2rem' }}>
          {([[undefined, 'All'], ['sent', 'Sent'], ['failed', 'Failed']] as const).map(([s, label]) => (
            <button key={label} onClick={() => { setStatus(s); setPage(0); }} className="chip"
              style={{ cursor: 'pointer', background: status === s ? 'var(--ember)' : 'var(--surf-high)',
                color: status === s ? '#fff' : 'var(--ink-2)', fontWeight: 500 }}>
              {label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><Spinner/></div>
        ) : !data?.entries.length ? (
          <EmptyState variant="notifications" title="No emails logged yet." body="Sent/failed attempts will show up here."/>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem', marginBottom: '1.4rem' }}>
            {data.entries.map(e => (
              <div key={e.id} className="card" style={{ padding: '.8rem 1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', marginBottom: e.error ? '.4rem' : 0 }}>
                  <span className="chip" style={{
                    background: e.status === 'sent' ? 'var(--green-dim)' : 'var(--red-dim)',
                    color: e.status === 'sent' ? 'var(--green)' : 'var(--red)', fontSize: '.66rem' }}>
                    {e.status}
                  </span>
                  <div style={{ flex: 1, minWidth: 0, fontSize: '.86rem' }}>
                    <strong>{e.subject}</strong> <span style={{ color: 'var(--ink-3)' }}>→ {e.toEmail}</span>
                  </div>
                  <span style={{ fontSize: '.7rem', color: 'var(--ink-4)', fontFamily: 'var(--font-dm-mono, DM Mono)', flexShrink: 0 }}>
                    {new Date(e.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                {e.error && (
                  <div style={{ fontSize: '.78rem', color: 'var(--red)', fontFamily: 'var(--font-dm-mono, DM Mono)' }}>{e.error}</div>
                )}
              </div>
            ))}
          </div>
        )}

        {!isLoading && total > PAGE_SIZE && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
            <button className="btn btn-soft" disabled={page === 0} onClick={() => setPage(p => p - 1)}
              style={{ opacity: page === 0 ? .4 : 1, fontSize: '.82rem' }}>← Prev</button>
            <span style={{ fontSize: '.8rem', color: 'var(--ink-3)' }}>Page {page + 1} of {pageCount}</span>
            <button className="btn btn-soft" disabled={page >= pageCount - 1} onClick={() => setPage(p => p + 1)}
              style={{ opacity: page >= pageCount - 1 ? .4 : 1, fontSize: '.82rem' }}>Next →</button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
