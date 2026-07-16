'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Spinner } from '@/components/ui/Spinner';
import { Icon } from '@/components/ui/Icon';
import { MiniChart } from '@/components/admin/MiniChart';
import { AdminSubNav } from '@/components/admin/AdminSubNav';
import { useAdminStats, useAdminSignupSeries, useAdminActivitySeries, useAdminSpaceStats } from '@/hooks/useAdmin';

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
  const { data: spaces, isLoading: spacesLoading } = useAdminSpaceStats();

  const kpis = stats ? [
    { label: 'Members', value: stats.members, icon: 'group-parent', color: 'var(--slate)', bg: 'var(--slate-dim)' },
    { label: 'Verified email', value: stats.verifiedEmails, icon: 'envelope', color: 'var(--green)', bg: 'var(--green-dim)',
      sub: stats.members ? `${Math.round((stats.verifiedEmails / stats.members) * 100)}% of members` : undefined },
    { label: 'Waitlist', value: stats.waitlist, icon: 'focus', color: 'var(--amber)', bg: 'var(--amber-dim)' },
    { label: 'Active bonds', value: stats.activeBonds, icon: 'bonds', color: 'var(--ember)', bg: 'var(--ember-dim)',
      sub: `${stats.activeCircles} forming` },
    {
      label: 'Pending reports', value: stats.pendingReports,
      icon: 'flag',
      color: stats.pendingReports > 0 ? 'var(--red)' : 'var(--green)',
      bg: stats.pendingReports > 0 ? 'var(--red-dim)' : 'var(--green-dim)',
      sub: stats.pendingReports > 0 ? 'Needs review' : 'All clear',
      href: '/admin/reports',
    },
    { label: 'Posts · 24h', value: stats.postsLast24h, icon: 'comment', color: 'var(--slate)', bg: 'var(--slate-dim)',
      sub: `${stats.postsLast7d} this week` },
    { label: 'Signups today', value: stats.signupsToday, icon: 'sprout', color: 'var(--green)', bg: 'var(--green-dim)',
      sub: `${stats.signupsThisWeek} this week` },
    { label: 'Active subs', value: stats.activeSubscriptions, icon: 'fire', color: 'var(--ember)', bg: 'var(--ember-dim)',
      sub: `${stats.trialingSubscriptions} trialing` },
  ] : [];

  const totalSignups = (signups ?? []).reduce((s, p) => s + p.count, 0);
  const totalActivity = (activity ?? []).reduce((s, p) => s + p.count, 0);
  const maxSpacePosts = Math.max(1, ...(spaces ?? []).map(s => s.postCount));

  return (
    <AppShell title="Admin">
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 1.6rem 3rem' }}>
        <AdminSubNav/>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginTop: '-.4rem', marginBottom: '1.4rem', flexWrap: 'wrap', gap: '.8rem' }}>
          <p style={{ color: 'var(--ink-3)', fontSize: '.88rem' }}>
            A read-and-act operating view of Grouv, not visible to regular members.
          </p>
          <button className="btn btn-soft" onClick={() => router.push('/admin/audit')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '.4rem', fontSize: '.84rem' }}>
            <Icon name="lock" size={15} stroke="var(--ink-2)"/> Audit log
          </button>
        </div>

        {statsLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><Spinner/></div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '.8rem', marginBottom: '1.6rem' }}>
            {kpis.map((k, i) => {
              const Tag = k.href ? 'button' : 'div';
              return (
                <Tag className="card rise" key={k.label}
                  onClick={k.href ? () => router.push(k.href!) : undefined}
                  style={{ padding: '1.05rem 1.2rem', animationDelay: `${i * 0.04}s`, textAlign: 'left', width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.55rem', marginBottom: '.65rem' }}>
                    <span style={{ width: 30, height: 30, borderRadius: '50%', background: k.bg, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name={k.icon} size={14} stroke={k.color} sw={1.8}/>
                    </span>
                    <div className="label-mono">{k.label}</div>
                  </div>
                  <div className="serif" style={{ fontSize: '1.7rem', fontWeight: 600, lineHeight: 1 }}>{k.value}</div>
                  {k.sub && <div style={{ fontSize: '.72rem', color: 'var(--ink-3)', marginTop: '.35rem' }}>{k.sub}</div>}
                </Tag>
              );
            })}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }} className="grid-2-mobile-stack">
          <div className="card" style={{ padding: '1.2rem 1.3rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.3rem' }}>
              <div className="label-mono">Signups</div>
              <RangeToggle days={days} setDays={setDays}/>
            </div>
            {signupsLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '1.5rem' }}><Spinner size={18}/></div>
            ) : (
              <MiniChart color="var(--ember)" headline={`${totalSignups} new · ${days}d`}
                data={(signups ?? []).map(p => ({ label: shortDate(p.date), value: p.count }))}/>
            )}
          </div>

          <div className="card" style={{ padding: '1.2rem 1.3rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.3rem' }}>
              <div className="label-mono">Active users</div>
              <RangeToggle days={days} setDays={setDays}/>
            </div>
            {activityLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '1.5rem' }}><Spinner size={18}/></div>
            ) : (
              <MiniChart color="var(--slate)" headline={`${totalActivity} interactions · ${days}d`}
                data={(activity ?? []).map(p => ({ label: shortDate(p.date), value: p.count }))}/>
            )}
          </div>
        </div>

        <div className="card" style={{ padding: '1.2rem 1.3rem' }}>
          <div className="label-mono" style={{ marginBottom: '1rem' }}>Most active spaces</div>
          {spacesLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '1.5rem' }}><Spinner size={18}/></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.65rem' }}>
              {(spaces ?? []).map(s => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '.8rem' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.colorHex, flexShrink: 0 }}/>
                  <div style={{ width: 100, fontSize: '.82rem', fontWeight: 500, flexShrink: 0,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                  <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--surf-high)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(s.postCount / maxSpacePosts) * 100}%`,
                      background: s.colorHex, borderRadius: 3, transition: 'width .5s ease' }}/>
                  </div>
                  <div style={{ width: 70, textAlign: 'right', fontSize: '.74rem', color: 'var(--ink-3)', flexShrink: 0,
                    fontFamily: 'var(--font-dm-mono, DM Mono)' }}>
                    {s.postCount} posts
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
