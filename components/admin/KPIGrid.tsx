'use client';
import { useRouter } from 'next/navigation';
import { Spinner } from '@/components/ui/Spinner';
import { Icon } from '@/components/ui/Icon';
import type { useAdminStats } from '@/hooks/useAdmin';

export function KPIGrid({ stats, loading }: {
  stats: ReturnType<typeof useAdminStats>['data'];
  loading: boolean;
}) {
  const router = useRouter();

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><Spinner /></div>;
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
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
      gap: '.8rem', marginBottom: '1.6rem'
    }}>
      {kpis.map((k, i) => {
        const Tag = k.href ? 'button' : 'div';
        return (
          <Tag className="card rise" key={k.label}
            onClick={k.href ? () => router.push(k.href!) : undefined}
            style={{ padding: '1.05rem 1.2rem', animationDelay: `${i * 0.04}s`, textAlign: 'left', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.55rem', marginBottom: '.65rem' }}>
              <span style={{
                width: 30, height: 30, borderRadius: '50%', background: k.bg, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Icon name={k.icon} size={14} stroke={k.color} sw={1.8} />
              </span>
              <div className="label-mono">{k.label}</div>
            </div>
            <div className="serif" style={{ fontSize: '1.7rem', fontWeight: 600, lineHeight: 1 }}>{k.value}</div>
            {k.sub && <div style={{ fontSize: '.72rem', color: 'var(--ink-3)', marginTop: '.35rem' }}>{k.sub}</div>}
          </Tag>
        );
      })}
    </div>
  );
}
