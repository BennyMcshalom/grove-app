'use client';
import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { AdminSubNav } from '@/components/admin/AdminSubNav';
import { useAdminBillingStats, useAdminSubscriptions } from '@/hooks/useAdmin';

const PAGE_SIZE = 25;

const STATUS_COLOR: Record<string, string> = {
  active: 'var(--green)', trialing: 'var(--ember)', past_due: 'var(--amber)',
  canceled: 'var(--ink-4)', incomplete: 'var(--ink-4)',
};
const STATUS_BG: Record<string, string> = {
  active: 'var(--green-dim)', trialing: 'var(--ember-dim)', past_due: 'var(--amber-dim)',
  canceled: 'var(--surf-high)', incomplete: 'var(--surf-high)',
};

export default function AdminBillingPage() {
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(0);
  const { data: stats, isLoading: statsLoading } = useAdminBillingStats();
  const { data, isLoading } = useAdminSubscriptions({ limit: PAGE_SIZE, offset: page * PAGE_SIZE, status });

  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const statuses = stats ? Object.keys(stats.byStatus) : [];

  return (
    <AppShell title="Billing">
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 1.6rem 3rem' }}>
        <AdminSubNav/>

        <p style={{ color: 'var(--ink-3)', fontSize: '.86rem', marginTop: '-.4rem', marginBottom: '1.2rem' }}>
          Read-only — subscription visibility only. No refund/cancel actions live here; use Stripe directly for those.
        </p>

        {statsLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><Spinner/></div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '.8rem', marginBottom: '1.4rem' }}>
            <div className="card" style={{ padding: '1rem 1.2rem' }}>
              <div className="label-mono" style={{ marginBottom: '.5rem' }}>Total subscriptions</div>
              <div className="serif" style={{ fontSize: '1.6rem', fontWeight: 600 }}>{stats?.total ?? 0}</div>
            </div>
            {Object.entries(stats?.byStatus ?? {}).map(([s, n]) => (
              <button key={s} onClick={() => { setStatus(s); setPage(0); }} className="card"
                style={{ padding: '1rem 1.2rem', textAlign: 'left', cursor: 'pointer',
                  border: status === s ? '1.5px solid var(--ember)' : undefined }}>
                <div className="label-mono" style={{ marginBottom: '.5rem', textTransform: 'capitalize' }}>{s.replace('_', ' ')}</div>
                <div className="serif" style={{ fontSize: '1.6rem', fontWeight: 600, color: STATUS_COLOR[s] ?? 'var(--ink)' }}>{n}</div>
              </button>
            ))}
          </div>
        )}

        {statuses.length > 0 && (
          <div style={{ display: 'flex', gap: '.5rem', marginBottom: '1.2rem', flexWrap: 'wrap' }}>
            <button onClick={() => { setStatus(undefined); setPage(0); }} className="chip"
              style={{ cursor: 'pointer', background: !status ? 'var(--ember)' : 'var(--surf-high)',
                color: !status ? '#fff' : 'var(--ink-2)', fontWeight: 500 }}>
              All
            </button>
            {statuses.map(s => (
              <button key={s} onClick={() => { setStatus(s); setPage(0); }} className="chip"
                style={{ cursor: 'pointer', background: status === s ? 'var(--ember)' : 'var(--surf-high)',
                  color: status === s ? '#fff' : 'var(--ink-2)', fontWeight: 500, textTransform: 'capitalize' }}>
                {s.replace('_', ' ')}
              </button>
            ))}
          </div>
        )}

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><Spinner/></div>
        ) : !data?.subscriptions.length ? (
          <EmptyState variant="notifications" title="No subscriptions found." body="Nothing matches this filter."/>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem', marginBottom: '1.4rem' }}>
            {data.subscriptions.map(s => (
              <div key={s.id} className="card" style={{ padding: '.9rem 1.1rem', display: 'flex', alignItems: 'center', gap: '.8rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ fontWeight: 600, fontSize: '.9rem' }}>{s.displayName ?? s.email ?? s.userId}</div>
                  {s.displayName && <div style={{ fontSize: '.76rem', color: 'var(--ink-4)' }}>{s.email}</div>}
                </div>
                <span className="chip" style={{ background: STATUS_BG[s.status] ?? 'var(--surf-high)',
                  color: STATUS_COLOR[s.status] ?? 'var(--ink-3)', fontSize: '.7rem', textTransform: 'capitalize' }}>
                  {s.status.replace('_', ' ')}
                </span>
                {s.cancelAtPeriodEnd && (
                  <span className="chip" style={{ background: 'var(--red-dim)', color: 'var(--red)', fontSize: '.68rem' }}>
                    Cancels at period end
                  </span>
                )}
                <div style={{ fontSize: '.76rem', color: 'var(--ink-3)', fontFamily: 'var(--font-dm-mono, DM Mono)' }}>
                  {s.trialEnd && s.status === 'trialing'
                    ? `Trial ends ${new Date(s.trialEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                    : s.currentPeriodEnd
                      ? `Renews ${new Date(s.currentPeriodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                      : '—'}
                </div>
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
