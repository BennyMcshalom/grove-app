'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { AdminSubNav } from '@/components/admin/AdminSubNav';
import { useToastStore } from '@/store/useToastStore';
import { useAdminReports, useDismissReport, useRemoveReportedContent } from '@/hooks/useAdmin';
import { ApiError, type ReportStatus, type ReportContentType } from '@/lib/api';

const PAGE_SIZE = 20;

const CONTENT_LABEL: Record<ReportContentType, string> = {
  post: 'Post', comment: 'Comment', bond_message: 'Bond message', anon_answer: 'Anonymous answer',
};
const CONTENT_ICON: Record<ReportContentType, string> = {
  post: 'comment', comment: 'comment', bond_message: 'bonds', anon_answer: 'lock',
};
const REASON_COLOR: Record<string, string> = {
  spam: 'var(--slate)', harassment: 'var(--red)', inappropriate: 'var(--amber)', other: 'var(--ink-3)',
};
const REASON_BG: Record<string, string> = {
  spam: 'var(--slate-dim)', harassment: 'var(--red-dim)', inappropriate: 'var(--amber-dim)', other: 'var(--surf-high)',
};

export default function AdminReportsPage() {
  const router = useRouter();
  const { toast } = useToastStore();
  const [status, setStatus] = useState<ReportStatus>('pending');
  const [page, setPage] = useState(0);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  const { data, isLoading } = useAdminReports({ limit: PAGE_SIZE, offset: page * PAGE_SIZE, status });
  const dismiss = useDismissReport();
  const remove = useRemoveReportedContent();

  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  async function handleDismiss(id: string) {
    try {
      await dismiss.mutateAsync(id);
      toast('Report dismissed.');
    } catch {
      toast('Could not dismiss report.');
    }
  }

  async function handleRemove(id: string) {
    try {
      await remove.mutateAsync(id);
      toast('Content removed.');
      setConfirmRemove(null);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Could not remove content.');
    }
  }

  return (
    <AppShell title="Reports">
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 1.6rem 3rem' }}>
        <AdminSubNav/>

        <div style={{ display: 'flex', gap: '.5rem', marginTop: '-.4rem', marginBottom: '1.2rem' }}>
          {(['pending', 'resolved', 'dismissed'] as const).map(s => (
            <button key={s} onClick={() => { setStatus(s); setPage(0); }} className="chip"
              style={{ cursor: 'pointer', background: status === s ? 'var(--ember)' : 'var(--surf-high)',
                color: status === s ? '#fff' : 'var(--ink-2)', fontWeight: 500, textTransform: 'capitalize' }}>
              {s}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><Spinner/></div>
        ) : !data?.reports.length ? (
          <EmptyState variant="notifications"
            title={status === 'pending' ? 'Nothing to review.' : `No ${status} reports.`}
            body={status === 'pending' ? "You're all caught up — new reports will show up here." : 'Nothing matches this filter yet.'}/>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem', marginBottom: '1.4rem' }}>
            {data.reports.map(r => (
              <div key={r.id} className="card rise" style={{ padding: '1rem 1.2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', marginBottom: '.7rem', flexWrap: 'wrap' }}>
                  <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--surf-high)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon name={CONTENT_ICON[r.contentType]} size={13} stroke="var(--ink-3)" sw={1.8}/>
                  </span>
                  <span style={{ fontSize: '.82rem', fontWeight: 600 }}>{CONTENT_LABEL[r.contentType]}</span>
                  <span className="chip" style={{ background: REASON_BG[r.reason], color: REASON_COLOR[r.reason], fontSize: '.66rem', textTransform: 'capitalize' }}>
                    {r.reason}
                  </span>
                  <span style={{ marginLeft: 'auto', fontSize: '.7rem', color: 'var(--ink-4)', fontFamily: 'var(--font-dm-mono, DM Mono)' }}>
                    {new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>

                {r.contentSnapshot && (
                  <p style={{ fontSize: '.88rem', color: 'var(--ink-2)', fontStyle: 'italic', lineHeight: 1.55,
                    background: 'var(--surf-low)', borderRadius: 'var(--r-sm)', padding: '.7rem .85rem', marginBottom: '.7rem' }}>
                    &ldquo;{r.contentSnapshot}&rdquo;
                  </p>
                )}

                {r.details && (
                  <p style={{ fontSize: '.8rem', color: 'var(--ink-3)', marginBottom: '.7rem' }}>
                    <span className="label-mono" style={{ marginRight: '.4rem' }}>Reporter note</span>{r.details}
                  </p>
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '.8rem', flexWrap: 'wrap' }}>
                  <div style={{ fontSize: '.78rem', color: 'var(--ink-3)' }}>
                    Reported by <strong>{r.reporterName ?? 'someone'}</strong>
                    {r.authorName && (
                      <>
                        {' '}· by{' '}
                        {r.authorId ? (
                          <button onClick={() => router.push(`/admin/users/${r.authorId}`)} style={{ color: 'var(--ink)', fontWeight: 600, textDecoration: 'underline' }}>
                            {r.authorName}
                          </button>
                        ) : <strong>{r.authorName}</strong>}
                      </>
                    )}
                  </div>

                  {r.status === 'pending' ? (
                    confirmRemove === r.id ? (
                      <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
                        <span style={{ fontSize: '.78rem', color: 'var(--red)', fontWeight: 500 }}>Remove this content?</span>
                        <button onClick={() => handleRemove(r.id)} disabled={remove.isPending}
                          className="btn btn-primary" style={{ background: 'var(--red)', boxShadow: 'none', fontSize: '.78rem', padding: '.35rem .8rem' }}>
                          {remove.isPending ? <Spinner size={12} color="#fff"/> : 'Remove'}
                        </button>
                        <button onClick={() => setConfirmRemove(null)} className="btn btn-soft" style={{ fontSize: '.78rem', padding: '.35rem .8rem' }}>
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '.5rem' }}>
                        <button onClick={() => handleDismiss(r.id)} disabled={dismiss.isPending}
                          className="btn btn-soft" style={{ fontSize: '.78rem', padding: '.4rem .85rem' }}>
                          Dismiss
                        </button>
                        <button onClick={() => setConfirmRemove(r.id)}
                          style={{ fontSize: '.78rem', padding: '.4rem .85rem', borderRadius: 'var(--r-md)',
                            background: 'var(--red-dim)', color: 'var(--red)', fontWeight: 600 }}>
                          Remove content
                        </button>
                      </div>
                    )
                  ) : (
                    <span style={{ fontSize: '.74rem', color: 'var(--ink-4)', fontStyle: 'italic', textTransform: 'capitalize' }}>
                      {r.resolutionAction ?? r.status}
                    </span>
                  )}
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
