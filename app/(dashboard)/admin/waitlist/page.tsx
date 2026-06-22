'use client';
import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { AdminSubNav } from '@/components/admin/AdminSubNav';
import { useAdminWaitlist } from '@/hooks/useAdmin';

const PAGE_SIZE = 30;

export default function AdminWaitlistPage() {
  const [page, setPage] = useState(0);
  const { data, isLoading } = useAdminWaitlist({ limit: PAGE_SIZE, offset: page * PAGE_SIZE });

  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <AppShell title="Waitlist">
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 1.6rem 3rem' }}>
        <AdminSubNav/>

        <p style={{ color: 'var(--ink-3)', marginTop: '-.4rem', marginBottom: '1.2rem', fontSize: '.88rem' }}>
          {total} {total === 1 ? 'person' : 'people'} waiting for an invite.
        </p>

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><Spinner/></div>
        ) : !data?.entries.length ? (
          <EmptyState variant="curio" title="Nobody on the waitlist yet." body="New pre-launch signups will show up here."/>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem', marginBottom: '1.4rem' }}>
            {data.entries.map((w, i) => (
              <div key={w.id} className="card rise" style={{ padding: '.85rem 1.1rem', display: 'flex',
                alignItems: 'center', gap: '.8rem', animationDelay: `${Math.min(i, 8) * 0.03}s` }}>
                <span style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--amber-dim)', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="focus" size={15} stroke="var(--amber)" sw={1.8}/>
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '.86rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {w.email}
                  </div>
                  {w.stageInterest && (
                    <div style={{ fontSize: '.74rem', color: 'var(--ink-3)', marginTop: '.1rem' }}>{w.stageInterest}</div>
                  )}
                </div>
                <div style={{ fontSize: '.7rem', color: 'var(--ink-4)', flexShrink: 0, fontFamily: 'var(--font-dm-mono, DM Mono)' }}>
                  {new Date(w.joinedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </div>
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
