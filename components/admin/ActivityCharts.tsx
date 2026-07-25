'use client';
import { Spinner } from '@/components/ui/Spinner';
import { MiniChart } from '@/components/admin/MiniChart';
import { RangeToggle } from '@/components/admin/RangeToggle';
import { shortDate } from '@/components/admin/dateFormat';
import type { useAdminSignupSeries, useAdminActivitySeries } from '@/hooks/useAdmin';

export function ActivityCharts({ days, setDays, signups, signupsLoading, activity, activityLoading }: {
  days: number; setDays: (n: number) => void;
  signups: ReturnType<typeof useAdminSignupSeries>['data'];
  signupsLoading: boolean;
  activity: ReturnType<typeof useAdminActivitySeries>['data'];
  activityLoading: boolean;
}) {
  const totalSignups = (signups ?? []).reduce((s, p) => s + p.count, 0);
  const totalActivity = (activity ?? []).reduce((s, p) => s + p.count, 0);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }} className="grid-2-mobile-stack">
      <div className="card" style={{ padding: '1.2rem 1.3rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.3rem' }}>
          <div className="label-mono">Signups</div>
          <RangeToggle days={days} setDays={setDays} />
        </div>
        {signupsLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '1.5rem' }}><Spinner size={18} /></div>
        ) : (
          <MiniChart color="var(--ember)" headline={`${totalSignups} new · ${days}d`}
            data={(signups ?? []).map(p => ({ label: shortDate(p.date), value: p.count }))} />
        )}
      </div>

      <div className="card" style={{ padding: '1.2rem 1.3rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.3rem' }}>
          <div className="label-mono">Active users</div>
          <RangeToggle days={days} setDays={setDays} />
        </div>
        {activityLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '1.5rem' }}><Spinner size={18} /></div>
        ) : (
          <MiniChart color="var(--slate)" headline={`${totalActivity} interactions · ${days}d`}
            data={(activity ?? []).map(p => ({ label: shortDate(p.date), value: p.count }))} />
        )}
      </div>
    </div>
  );
}
