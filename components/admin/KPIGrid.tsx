'use client';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { Spinner } from '@/components/ui/Spinner';
import { Icon } from '@/components/ui/Icon';
import type { useAdminStats } from '@/hooks/useAdmin';
import styles from './KPIGrid.module.css';

export function KPIGrid({ stats, loading }: {
  stats: ReturnType<typeof useAdminStats>['data'];
  loading: boolean;
}) {
  const router = useRouter();

  if (loading) {
    return <div className={styles.loadingWrap}><Spinner /></div>;
  }

  const kpis = stats ? [
    { label: 'Members', value: stats.members, icon: 'group-parent', color: 'var(--slate)', bg: 'var(--slate-dim)' },
    {
      label: 'Verified email', value: stats.verifiedEmails, icon: 'envelope', color: 'var(--green)', bg: 'var(--green-dim)',
      sub: stats.members ? `${Math.round((stats.verifiedEmails / stats.members) * 100)}% of members` : undefined
    },
    { label: 'Waitlist', value: stats.waitlist, icon: 'focus', color: 'var(--amber)', bg: 'var(--amber-dim)' },
    {
      label: 'My Circle', value: stats.activeBonds, icon: 'bonds', color: 'var(--ember)', bg: 'var(--ember-dim)',
      sub: `${stats.activeCircles} forming`
    },
    {
      label: 'Pending reports', value: stats.pendingReports,
      icon: 'flag',
      color: stats.pendingReports > 0 ? 'var(--red)' : 'var(--green)',
      bg: stats.pendingReports > 0 ? 'var(--red-dim)' : 'var(--green-dim)',
      sub: stats.pendingReports > 0 ? 'Needs review' : 'All clear',
      href: '/admin/reports',
    },
    {
      label: 'Posts · 24h', value: stats.postsLast24h, icon: 'comment', color: 'var(--slate)', bg: 'var(--slate-dim)',
      sub: `${stats.postsLast7d} this week`
    },
    {
      label: 'Signups today', value: stats.signupsToday, icon: 'sprout', color: 'var(--green)', bg: 'var(--green-dim)',
      sub: `${stats.signupsThisWeek} this week`
    },
    {
      label: 'Active subs', value: stats.activeSubscriptions, icon: 'fire', color: 'var(--ember)', bg: 'var(--ember-dim)',
      sub: `${stats.trialingSubscriptions} trialing`
    },
  ] : [];

  return (
    <div className={styles.grid}>
      {kpis.map((k, i) => {
        const Tag = k.href ? 'button' : 'div';
        return (
          <Tag className={clsx('card', 'rise', styles.kpiCard)} key={k.label}
            onClick={k.href ? () => router.push(k.href!) : undefined}
            style={{ animationDelay: `${i * 0.04}s` }}>
            <div className={styles.kpiHeader}>
              <span className={styles.kpiIconCircle} style={{ background: k.bg }}>
                <Icon name={k.icon} size={14} stroke={k.color} sw={1.8} />
              </span>
              <div className="label-mono">{k.label}</div>
            </div>
            <div className={clsx('serif', styles.kpiValue)}>{k.value}</div>
            {k.sub && <div className={styles.kpiSub}>{k.sub}</div>}
          </Tag>
        );
      })}
    </div>
  );
}
