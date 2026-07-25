'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Icon } from '@/components/ui/Icon';
import { AdminSubNav } from '@/components/admin/AdminSubNav';
import { KPIGrid } from '@/components/admin/KPIGrid';
import { ActivityCharts } from '@/components/admin/ActivityCharts';
import { SpaceActivityList } from '@/components/admin/SpaceActivityList';
import { useAdminStats, useAdminSignupSeries, useAdminActivitySeries, useAdminSpaceStats } from '@/hooks/useAdmin';

export default function AdminOverviewPage() {
  const router = useRouter();
  const [days, setDays] = useState(30);
  const { data: stats, isLoading: statsLoading } = useAdminStats();
  const { data: signups, isLoading: signupsLoading } = useAdminSignupSeries(days);
  const { data: activity, isLoading: activityLoading } = useAdminActivitySeries(days);
  const { data: spaces, isLoading: spacesLoading } = useAdminSpaceStats();

  return (
    <AppShell title="Admin">
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 1.6rem 3rem' }}>
        <AdminSubNav />

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginTop: '-.4rem', marginBottom: '1.4rem', flexWrap: 'wrap', gap: '.8rem'
        }}>
          <p style={{ color: 'var(--ink-3)', fontSize: '.88rem' }}>
            A read-and-act operating view of Grouv, not visible to regular members.
          </p>
          <button className="btn btn-soft" onClick={() => router.push('/admin/audit')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '.4rem', fontSize: '.84rem' }}>
            <Icon name="lock" size={15} stroke="var(--ink-2)" /> Audit log
          </button>
        </div>

        <KPIGrid stats={stats} loading={statsLoading} />

        <ActivityCharts days={days} setDays={setDays}
          signups={signups} signupsLoading={signupsLoading}
          activity={activity} activityLoading={activityLoading} />

        <SpaceActivityList spaces={spaces} loading={spacesLoading} />
      </div>
    </AppShell>
  );
}
