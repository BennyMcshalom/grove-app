'use client';
import { useState } from 'react';
import clsx from 'clsx';
import { Icon } from './Icon';
import { Spinner } from './Spinner';
import { useToastStore } from '@/store/useToastStore';
import { useSubmitReport } from '@/hooks/useReports';
import { ApiError, type ReportContentType, type ReportReason } from '@/lib/api';
import styles from './ReportModal.module.css';

interface ReportModalProps {
  contentType: ReportContentType;
  contentId: string;
  onClose: () => void;
}

const REASONS: { value: ReportReason; label: string }[] = [
  { value: 'spam', label: 'Spam' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'inappropriate', label: 'Inappropriate' },
  { value: 'other', label: 'Other' },
];

export function ReportModal({ contentType, contentId, onClose }: ReportModalProps) {
  const { toast } = useToastStore();
  const submitReport = useSubmitReport();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');

  async function handleSubmit() {
    if (!reason) return;
    try {
      await submitReport.mutateAsync({ contentType, contentId, reason, details: details.trim() || undefined });
      toast("Thanks, we'll take a look.");
      onClose();
    } catch (err) {
      toast(err instanceof ApiError && err.status === 409 ? "You've already reported this." : 'Could not submit report.');
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={clsx('rise', styles.modal)} onClick={e => e.stopPropagation()}>
        <div className={styles.body}>
          <div className={styles.header}>
            <h3 className={clsx('serif', styles.title)}>Report this</h3>
            <button onClick={onClose} className={styles.closeBtn}>
              <Icon name="close" size={16} stroke="var(--ink-3)" />
            </button>
          </div>

          <div className={clsx('label-mono', styles.reasonLabel)}>What&apos;s wrong with it?</div>
          <div className={styles.reasonsWrap}>
            {REASONS.map(r => (
              <button key={r.value} onClick={() => setReason(r.value)}
                className={clsx('chip', styles.reasonChip, reason === r.value && styles.active)}>
                {r.label}
              </button>
            ))}
          </div>

          <textarea
            value={details}
            onChange={e => setDetails(e.target.value.slice(0, 500))}
            placeholder="Anything else we should know? (optional)"
            className={styles.detailsInput}
          />

          <button
            onClick={handleSubmit}
            disabled={!reason || submitReport.isPending}
            className={clsx('btn', 'btn-primary', 'btn-block', styles.submitBtn, reason && styles.active)}
          >
            {submitReport.isPending ? <Spinner size={14} color="#fff" /> : 'Submit report'}
          </button>
        </div>
      </div>
    </div>
  );
}
