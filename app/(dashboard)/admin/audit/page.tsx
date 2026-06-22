'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAdminAuditLog } from '@/hooks/useAdmin';

const PAGE_SIZE = 30;

const ACTION_LABEL: Record<string, string> = {
  suspend: 'suspended', unsuspend: 'reactivated', ban: 'banned', unban: 'reactivated',
  grant_admin: 'granted admin to', revoke_admin: 'revoked admin from',
  verify_email: 'force-verified the email of', delete_user: 'deleted',
};

const ACTION_COLOR: Record<string, string> = {
  suspend: 'var(--amber)', unsuspend: 'var(--green)', ban: 'var(--red)', unban: 'var(--green)',
  grant_admin: 'var(--slate)', revoke_admin: 'var(--slate)',
  verify_email: 'var(--sage)', delete_user: 'var(--red)',
};

export default function AdminAuditPage() {
  const router = useRouter();
  const [page, setPage] = useState(0);
  const { data, isLoading } = useAdminAuditLog({ limit: PAGE_SIZE, offset: page * PAGE_SIZE });

  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <AppShell title="Audit log">
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 1.6rem 3rem' }}>
        <button onClick={() => router.push('/admin')}
          style={{ display: 'flex', alignItems: 'center', gap: '.3rem', fontSize: '.82rem', color: 'var(--ink-3)', marginBottom: '1rem' }}>
          <Icon name="back" size={16} stroke="var(--ink-3)"/> Overview
        </button>
        <p style={{ color: 'var(--ink-3)', marginBottom: '1.2rem', fontSize: '.88rem' }}>
          Every moderation action taken by an admin, in order.
        </p>

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><Spinner/></div>
        ) : !data?.entries.length ? (
          <EmptyState variant="notifications" title="No actions yet." body="Moderation actions will be recorded here."/>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem', marginBottom: '1.4rem' }}>
            {data.entries.map(entry => (
              <div key={entry.id} className="card" style={{ padding: '.9rem 1.1rem' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '.8rem' }}>
                  <p style={{ fontSize: '.86rem', lineHeight: 1.5 }}>
                    <strong>{entry.adminName ?? 'An admin'}</strong>{' '}
                    <span style={{ color: ACTION_COLOR[entry.action] ?? 'var(--ink-2)', fontWeight: 500 }}>
                      {ACTION_LABEL[entry.action] ?? entry.action}
                    </span>{' '}
                    {entry.targetEmail ?? 'a deleted account'}
                  </p>
                  <span style={{ fontSize: '.7rem', color: 'var(--ink-4)', flexShrink: 0, fontFamily: 'var(--font-dm-mono, DM Mono)' }}>
                    {new Date(entry.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                {entry.reason && (
                  <p style={{ fontSize: '.78rem', color: 'var(--ink-3)', fontStyle: 'italic', marginTop: '.35rem' }}>
                    &ldquo;{entry.reason}&rdquo;
                  </p>
                )}
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
