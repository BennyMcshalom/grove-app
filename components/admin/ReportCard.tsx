'use client';
import clsx from 'clsx';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import type { AdminReport, ReportContentType } from '@/lib/api';
import styles from './ReportCard.module.css';

const CONTENT_LABEL: Record<ReportContentType, string> = {
  post: 'Post', comment: 'Comment', bond_message: 'Bond message', anon_answer: 'Anonymous answer',
};
const CONTENT_ICON: Record<ReportContentType, string> = {
  post: 'comment', comment: 'comment', bond_message: 'bonds', anon_answer: 'lock',
};

export function ReportCard({ r, confirming, dismissPending, removePending,
  onDismiss, onRequestRemove, onConfirmRemove, onCancelRemove }: {
  r: AdminReport;
  confirming: boolean;
  dismissPending: boolean; removePending: boolean;
  onDismiss: () => void; onRequestRemove: () => void; onConfirmRemove: () => void; onCancelRemove: () => void;
}) {
  const router = useRouter();

  return (
    <div className={clsx('card', 'rise', styles.card)}>
      <div className={styles.header}>
        <span className={styles.iconCircle}>
          <Icon name={CONTENT_ICON[r.contentType]} size={13} stroke="var(--ink-3)" sw={1.8}/>
        </span>
        <span className={styles.contentLabel}>{CONTENT_LABEL[r.contentType]}</span>
        <span className={clsx('chip', styles.reasonChip, styles[r.reason] ?? styles.other)}>
          {r.reason}
        </span>
        <span className={styles.date}>
          {new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      </div>

      {r.contentSnapshot && (
        <p className={styles.snapshot}>
          &ldquo;{r.contentSnapshot}&rdquo;
        </p>
      )}

      {r.details && (
        <p className={styles.details}>
          <span className={clsx('label-mono', styles.detailsLabel)}>Reporter note</span>{r.details}
        </p>
      )}

      <div className={styles.footer}>
        <div className={styles.reportedBy}>
          Reported by <strong>{r.reporterName ?? 'someone'}</strong>
          {r.authorName && (
            <>
              {' '}· by{' '}
              {r.authorId ? (
                <button onClick={() => router.push(`/admin/users/${r.authorId}`)} className={styles.authorLink}>
                  {r.authorName}
                </button>
              ) : <strong>{r.authorName}</strong>}
            </>
          )}
        </div>

        {r.status === 'pending' ? (
          confirming ? (
            <div className={styles.confirmWrap}>
              <span className={styles.confirmText}>Remove this content?</span>
              <button onClick={onConfirmRemove} disabled={removePending}
                className={clsx('btn', 'btn-primary', styles.dangerBtn)}>
                {removePending ? <Spinner size={12} color="#fff"/> : 'Remove'}
              </button>
              <button onClick={onCancelRemove} className={clsx('btn', 'btn-soft', styles.softBtn)}>
                Cancel
              </button>
            </div>
          ) : (
            <div className={styles.actionsWrap}>
              <button onClick={onDismiss} disabled={dismissPending}
                className={clsx('btn', 'btn-soft', styles.dismissBtn)}>
                Dismiss
              </button>
              <button onClick={onRequestRemove} className={styles.removeBtn}>
                Remove content
              </button>
            </div>
          )
        ) : (
          <span className={styles.resolvedLabel}>
            {r.resolutionAction ?? r.status}
          </span>
        )}
      </div>
    </div>
  );
}
