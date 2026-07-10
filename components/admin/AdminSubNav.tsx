'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { useAdminReports } from '@/hooks/useAdmin';
import { useAuthStore } from '@/store/useAuthStore';

interface Tab { href: string; label: string; }
interface Group { id: string; label: string; icon: string; tabs: Tab[]; }

const MODERATION: Group = {
  id: 'moderation', label: 'Moderation', icon: 'flag',
  tabs: [
    { href: '/admin/reports', label: 'Reports' },
    { href: '/admin/search',  label: 'Content search' },
    { href: '/admin/groups',  label: 'Groups' },
  ],
};

const GROUPS: Group[] = [
  { id: 'overview', label: 'Overview', icon: 'stats', tabs: [{ href: '/admin', label: 'Overview' }] },
  MODERATION,
  {
    id: 'growth', label: 'Growth', icon: 'sprout',
    tabs: [
      { href: '/admin/users',    label: 'Users' },
      { href: '/admin/waitlist', label: 'Waitlist' },
      { href: '/admin/billing',  label: 'Billing' },
    ],
  },
  {
    id: 'system', label: 'System', icon: 'gear',
    tabs: [
      { href: '/admin/feature-flags', label: 'Feature flags' },
      { href: '/admin/email-log',     label: 'Email log' },
      { href: '/admin/audit',         label: 'Audit log' },
    ],
  },
];

function isTabActive(pathname: string, href: string): boolean {
  return href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);
}

function TabRow({ tabs, pathname, pendingReports }: { tabs: Tab[]; pathname: string; pendingReports?: number }) {
  return (
    <div className="scroll" style={{ display: 'flex', gap: '1.4rem', borderBottom: '1px solid var(--border)',
      marginBottom: '1.6rem', overflowX: 'auto' }}>
      {tabs.map(t => {
        const active = isTabActive(pathname, t.href);
        const badge = t.href === '/admin/reports' ? pendingReports : undefined;
        return (
          <Link key={t.href} href={t.href}
            style={{ display: 'flex', alignItems: 'center', gap: '.4rem',
              paddingBottom: '.7rem', fontSize: '.92rem', fontWeight: active ? 600 : 500,
              color: active ? 'var(--ember)' : 'var(--ink-3)', whiteSpace: 'nowrap', flexShrink: 0,
              borderBottom: active ? '2px solid var(--ember)' : '2px solid transparent', marginBottom: -1,
              textDecoration: 'none', transition: 'color .15s' }}>
            {t.label}
            {!!badge && (
              <span className="mono" style={{ fontSize: '.62rem', fontWeight: 600,
                background: active ? 'var(--ember)' : 'var(--amber)', color: '#fff',
                padding: '.05rem .4rem', borderRadius: 100 }}>
                {badge}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}

export function AdminSubNav() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const isAdmin = user?.roles.includes('admin') ?? false;

  // /admin/reports is staff-accessible (admin or moderator), so the pending
  // count for the nav badge comes from there rather than the admin-only
  // /admin/stats endpoint, which moderators can't call.
  const { data: reportsData } = useAdminReports({ limit: 1, status: 'pending' });
  const pendingReports = reportsData?.total;

  // Moderators only ever have Moderation's tabs to see — skip the group
  // switcher entirely rather than showing a switcher with one option.
  if (!isAdmin) {
    return <TabRow tabs={MODERATION.tabs} pathname={pathname} pendingReports={pendingReports}/>;
  }

  const activeGroup = GROUPS.find(g => g.tabs.some(t => isTabActive(pathname, t.href))) ?? GROUPS[0];

  return (
    <div style={{ marginBottom: '1.6rem' }}>
      <div className="scroll" style={{ display: 'flex', gap: '.5rem', marginBottom: '1rem', overflowX: 'auto' }}>
        {GROUPS.map(g => {
          const active = g.id === activeGroup.id;
          const badge = g.id === 'moderation' ? pendingReports : undefined;
          return (
            <Link key={g.id} href={g.tabs[0].href}
              style={{ display: 'flex', alignItems: 'center', gap: '.4rem', flexShrink: 0,
                padding: '.45rem .85rem', borderRadius: 100, fontSize: '.84rem', fontWeight: 500,
                textDecoration: 'none', transition: 'background .15s, color .15s',
                background: active ? 'var(--ember)' : 'var(--surf-high)',
                color: active ? '#fff' : 'var(--ink-2)' }}>
              <Icon name={g.icon} size={14} stroke={active ? '#fff' : 'var(--ink-3)'} sw={1.8}/>
              {g.label}
              {!!badge && (
                <span className="mono" style={{ fontSize: '.6rem', fontWeight: 600,
                  background: active ? 'rgba(255,255,255,.25)' : 'var(--amber)',
                  color: active ? '#fff' : '#fff', padding: '.05rem .38rem', borderRadius: 100 }}>
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {activeGroup.tabs.length > 1 && (
        <TabRow tabs={activeGroup.tabs} pathname={pathname} pendingReports={pendingReports}/>
      )}
    </div>
  );
}
