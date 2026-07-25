'use client';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import type { AdminReport, ReportContentType } from '@/lib/api';

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

export function ReportCard({ r, confirming, dismissPending, removePending,
  onDismiss, onRequestRemove, onConfirmRemove, onCancelRemove }: {
  r: AdminReport;
  confirming: boolean;
  dismissPending: boolean; removePending: boolean;
  onDismiss: () => void; onRequestRemove: () => void; onConfirmRemove: () => void; onCancelRemove: () => void;
}) {
  const router = useRouter();

  return (
    <div className="card rise" style={{ padding: '1rem 1.2rem' }}>
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
          confirming ? (
            <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '.78rem', color: 'var(--red)', fontWeight: 500 }}>Remove this content?</span>
              <button onClick={onConfirmRemove} disabled={removePending}
                className="btn btn-primary" style={{ background: 'var(--red)', boxShadow: 'none', fontSize: '.78rem', padding: '.35rem .8rem' }}>
                {removePending ? <Spinner size={12} color="#fff"/> : 'Remove'}
              </button>
              <button onClick={onCancelRemove} className="btn btn-soft" style={{ fontSize: '.78rem', padding: '.35rem .8rem' }}>
                Cancel
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '.5rem' }}>
              <button onClick={onDismiss} disabled={dismissPending}
                className="btn btn-soft" style={{ fontSize: '.78rem', padding: '.4rem .85rem' }}>
                Dismiss
              </button>
              <button onClick={onRequestRemove}
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
  );
}
