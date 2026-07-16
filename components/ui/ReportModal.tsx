'use client';
import { useState } from 'react';
import { Icon } from './Icon';
import { Spinner } from './Spinner';
import { useToastStore } from '@/store/useToastStore';
import { useSubmitReport } from '@/hooks/useReports';
import { ApiError, type ReportContentType, type ReportReason } from '@/lib/api';

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
      toast('Thanks, we\'ll take a look.');
      onClose();
    } catch (err) {
      toast(err instanceof ApiError && err.status === 409 ? 'You\'ve already reported this.' : 'Could not submit report.');
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(26,26,26,.55)',
      backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1.5rem' }}
      onClick={onClose}>
      <div className="rise" style={{ width: 'min(420px, 94vw)', background: 'var(--cream)', borderRadius: 20,
        boxShadow: 'var(--shadow-lg)', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ padding: '1.4rem 1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.1rem' }}>
            <h3 className="serif" style={{ fontSize: '1.25rem', fontWeight: 600 }}>Report this</h3>
            <button onClick={onClose}
              style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name="close" size={16} stroke="var(--ink-3)"/>
            </button>
          </div>

          <div className="label-mono" style={{ marginBottom: '.6rem' }}>What&apos;s wrong with it?</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem', marginBottom: '1rem' }}>
            {REASONS.map(r => (
              <button key={r.value} onClick={() => setReason(r.value)} className="chip"
                style={{ cursor: 'pointer', background: reason === r.value ? 'var(--ember)' : 'var(--surf-high)',
                  color: reason === r.value ? '#fff' : 'var(--ink-2)', fontWeight: 500 }}>
                {r.label}
              </button>
            ))}
          </div>

          <textarea value={details} onChange={e => setDetails(e.target.value.slice(0, 500))}
            placeholder="Anything else we should know? (optional)"
            style={{ width: '100%', minHeight: 70, padding: '.7rem .85rem', fontSize: '.86rem',
              border: '1px solid var(--border-2)', borderRadius: 'var(--r-sm)', resize: 'vertical', marginBottom: '1.1rem',
              background: 'var(--white)' }}/>

          <button onClick={handleSubmit} disabled={!reason || submitReport.isPending}
            className="btn btn-primary btn-block" style={{ opacity: reason ? 1 : .6 }}>
            {submitReport.isPending ? <Spinner size={14} color="#fff"/> : 'Submit report'}
          </button>
        </div>
      </div>
    </div>
  );
}
