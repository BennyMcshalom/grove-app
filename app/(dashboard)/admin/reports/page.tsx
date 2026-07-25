'use client';
import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { AdminSubNav } from '@/components/admin/AdminSubNav';
import { ReportCard } from '@/components/admin/ReportCard';
import { Pagination } from '@/components/admin/Pagination';
import { useToastStore } from '@/store/useToastStore';
import { useAdminReports, useDismissReport, useRemoveReportedContent } from '@/hooks/useAdmin';
import { ApiError, type ReportStatus } from '@/lib/api';

const PAGE_SIZE = 20;

export default function AdminReportsPage() {
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
            body={status === 'pending' ? "You're all caught up. New reports will show up here." : 'Nothing matches this filter yet.'}/>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem', marginBottom: '1.4rem' }}>
            {data.reports.map(r => (
              <ReportCard key={r.id} r={r} confirming={confirmRemove === r.id}
                dismissPending={dismiss.isPending} removePending={remove.isPending}
                onDismiss={() => handleDismiss(r.id)}
                onRequestRemove={() => setConfirmRemove(r.id)}
                onConfirmRemove={() => handleRemove(r.id)}
                onCancelRemove={() => setConfirmRemove(null)} />
            ))}
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
