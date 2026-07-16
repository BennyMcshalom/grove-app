'use client';
import { AppShell } from '@/components/layout/AppShell';
import { Spinner } from '@/components/ui/Spinner';
import { AdminSubNav } from '@/components/admin/AdminSubNav';
import { useToastStore } from '@/store/useToastStore';
import { useAdminFeatureFlags, useSetFeatureFlag } from '@/hooks/useAdmin';
import { ApiError } from '@/lib/api';

function Toggle({ on, onChange, disabled }: { on: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button onClick={onChange} disabled={disabled} aria-label={on ? 'On' : 'Off'}
      style={{ width: 44, height: 26, borderRadius: 100, background: on ? 'var(--ember)' : 'var(--border-2)',
        position: 'relative', flexShrink: 0, opacity: disabled ? .6 : 1, transition: 'background .2s' }}>
      <span style={{ position: 'absolute', top: 3, left: on ? 21 : 3, width: 20, height: 20, borderRadius: '50%',
        background: '#fff', transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)', display: 'block' }}/>
    </button>
  );
}

export default function AdminFeatureFlagsPage() {
  const { toast } = useToastStore();
  const { data: flags, isLoading } = useAdminFeatureFlags();
  const setFlag = useSetFeatureFlag();

  async function toggle(key: string, next: boolean) {
    try { await setFlag.mutateAsync({ key, enabled: next }); toast(`${key} ${next ? 'enabled' : 'disabled'}.`); }
    catch (err) { toast(err instanceof ApiError ? err.message : 'Could not update flag.'); }
  }

  return (
    <AppShell title="Feature flags">
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '0 1.6rem 3rem' }}>
        <AdminSubNav/>

        <p style={{ color: 'var(--ink-3)', fontSize: '.86rem', marginTop: '-.4rem', marginBottom: '1.2rem' }}>
          Operational toggles. Take effect immediately, no deploy needed.
        </p>

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><Spinner/></div>
        ) : (
          <div className="card" style={{ padding: '.4rem 1.4rem' }}>
            {(flags ?? []).map((f, i) => (
              <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 0',
                borderBottom: i < (flags?.length ?? 0) - 1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '.92rem', fontFamily: 'var(--font-dm-mono, DM Mono)' }}>{f.key}</div>
                  <div style={{ fontSize: '.82rem', color: 'var(--ink-3)', marginTop: '.2rem' }}>{f.description}</div>
                </div>
                <Toggle on={f.enabled} disabled={setFlag.isPending} onChange={() => toggle(f.key, !f.enabled)}/>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
