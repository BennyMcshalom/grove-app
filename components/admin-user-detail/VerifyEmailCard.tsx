import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';

// ── Verify email ──
export function VerifyEmailCard({ onVerify, pending }: { onVerify: () => void; pending: boolean }) {
  return (
    <div className="card" style={{ padding: '1.2rem 1.3rem', marginBottom: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.3rem' }}>
          <Icon name="envelope" size={13} stroke="var(--ink-3)"/>
          <div className="label-mono">Email unverified</div>
        </div>
        <p style={{ fontSize: '.82rem', color: 'var(--ink-3)' }}>Skip the verification email and mark it verified directly.</p>
      </div>
      <button disabled={pending} onClick={onVerify} className="btn btn-soft" style={{ fontSize: '.82rem', flexShrink: 0 }}>
        {pending ? <Spinner size={14}/> : 'Force-verify'}
      </button>
    </div>
  );
}
