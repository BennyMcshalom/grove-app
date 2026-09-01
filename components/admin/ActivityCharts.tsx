'use client';
import clsx from 'clsx';
import { Spinner } from '@/components/ui/Spinner';
import { MiniChart } from '@/components/admin/MiniChart';
import { RangeToggle } from '@/components/admin/RangeToggle';
import { shortDate } from '@/components/admin/dateFormat';
import type { useAdminSignupSeries, useAdminActivitySeries } from '@/hooks/useAdmin';
import styles from './ActivityCharts.module.css';

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
    <div className={clsx('grid-2-mobile-stack', styles.grid)}>
      <div className={clsx('card', styles.chartCard)}>
        <div className={styles.chartHeader}>
          <div className="label-mono">Signups</div>
          <RangeToggle days={days} setDays={setDays} />
        </div>
        {signupsLoading ? (
          <div className={styles.loadingWrap}><Spinner size={18} /></div>
        ) : (
          <MiniChart color="var(--ember)" headline={`${totalSignups} new · ${days}d`}
            data={(signups ?? []).map(p => ({ label: shortDate(p.date), value: p.count }))} />
        )}
      </div>

      <div className={clsx('card', styles.chartCard)}>
        <div className={styles.chartHeader}>
          <div className="label-mono">Active users</div>
          <RangeToggle days={days} setDays={setDays} />
        </div>
        {activityLoading ? (
          <div className={styles.loadingWrap}><Spinner size={18} /></div>
        ) : (
          <MiniChart color="var(--slate)" headline={`${totalActivity} interactions · ${days}d`}
            data={(activity ?? []).map(p => ({ label: shortDate(p.date), value: p.count }))} />
        )}
      </div>
    </div>
  );
}
