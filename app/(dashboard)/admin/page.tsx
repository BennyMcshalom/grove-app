'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Spinner } from '@/components/ui/Spinner';
import { Icon } from '@/components/ui/Icon';
import { MiniChart } from '@/components/admin/MiniChart';
import { useAdminStats, useAdminSignupSeries, useAdminActivitySeries } from '@/hooks/useAdmin';

function shortDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function RangeToggle({ days, setDays }: { days: number; setDays: (n: number) => void }) {
  return (
    <div style={{ display: 'flex', gap: '.3rem' }}>
      {[7, 30, 90].map(d => (
        <button key={d} onClick={() => setDays(d)} className="chip"
          style={{ cursor: 'pointer', background: days === d ? 'var(--ember)' : 'var(--surf-high)',
            color: days === d ? '#fff' : 'var(--ink-2)', fontWeight: 500 }}>
          {d}d
        </button>
      ))}
    </div>
  );
}

export default function AdminOverviewPage() {
  const router = useRouter();
  const [days, setDays] = useState(30);
  const { data: stats, isLoading: statsLoading } = useAdminStats();
  const { data: signups, isLoading: signupsLoading } = useAdminSignupSeries(days);
  const { data: activity, isLoading: activityLoading } = useAdminActivitySeries(days);

  const kpis = stats ? [
    { label: 'Members', value: stats.members },
    { label: 'Verified email', value: stats.verifiedEmails, sub: stats.members ? `${Math.round((stats.verifiedEmails / stats.members) * 100)}%` : undefined },
    { label: 'Waitlist', value: stats.waitlist },
    { label: 'Active bonds', value: stats.activeBonds, sub: `${stats.activeCircles} forming` },
    { label: 'Posts · 24h', value: stats.postsLast24h, sub: `${stats.postsLast7d} this week` },
    { label: 'Signups today', value: stats.signupsToday, sub: `${stats.signupsThisWeek} this week` },
    { label: 'Active subs', value: stats.activeSubscriptions, sub: `${stats.trialingSubscriptions} trialing` },
  ] : [];

  return (
    <AppShell title="Admin">
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 1.6rem 3rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginTop: '-.4rem', marginBottom: '1.4rem', flexWrap: 'wrap', gap: '.8rem' }}>
          <p style={{ color: 'var(--ink-3)', fontSize: '.88rem' }}>
            A read-and-act operating view of Grouw — not visible to regular members.
          </p>
          <div style={{ display: 'flex', gap: '.6rem' }}>
            <button className="btn btn-soft" onClick={() => router.push('/admin/users')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '.4rem', fontSize: '.84rem' }}>
              <Icon name="search" size={15} stroke="var(--ink-2)"/> User directory
            </button>
            <button className="btn btn-soft" onClick={() => router.push('/admin/audit')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '.4rem', fontSize: '.84rem' }}>
              <Icon name="lock" size={15} stroke="var(--ink-2)"/> Audit log
            </button>
          </div>
        </div>

        {statsLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><Spinner/></div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))',
            gap: '.8rem', marginBottom: '1.6rem' }}>
            {kpis.map(k => (
              <div className="card" key={k.label} style={{ padding: '1.05rem 1.25rem' }}>
                <div className="label-mono" style={{ marginBottom: '.4rem' }}>{k.label}</div>
                <div className="serif" style={{ fontSize: '1.7rem', fontWeight: 600, lineHeight: 1 }}>{k.value}</div>
                {k.sub && <div style={{ fontSize: '.72rem', color: 'var(--ink-3)', marginTop: '.3rem' }}>{k.sub}</div>}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }} className="grid-2-mobile-stack">
          <div className="card" style={{ padding: '1.2rem 1.3rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div className="label-mono">Signups</div>
              <RangeToggle days={days} setDays={setDays}/>
            </div>
            {signupsLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '1.5rem' }}><Spinner size={18}/></div>
            ) : (
              <MiniChart color="var(--ember)"
                data={(signups ?? []).map(p => ({ label: shortDate(p.date), value: p.count }))}/>
            )}
          </div>

          <div className="card" style={{ padding: '1.2rem 1.3rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div className="label-mono">Active users</div>
              <RangeToggle days={days} setDays={setDays}/>
            </div>
            {activityLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '1.5rem' }}><Spinner size={18}/></div>
            ) : (
              <MiniChart color="var(--slate)"
                data={(activity ?? []).map(p => ({ label: shortDate(p.date), value: p.count }))}/>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
