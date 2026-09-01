'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { Icon } from '@/components/ui/Icon';
import { useAdminReports } from '@/hooks/useAdmin';
import { useAuthStore } from '@/store/useAuthStore';
import styles from './AdminSubNav.module.css';

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
    <div className={clsx('scroll', styles.tabRow)}>
      {tabs.map(t => {
        const active = isTabActive(pathname, t.href);
        const badge = t.href === '/admin/reports' ? pendingReports : undefined;
        return (
          <Link key={t.href} href={t.href} className={clsx(styles.tab, active && styles.active)}>
            {t.label}
            {!!badge && (
              <span className={clsx('mono', styles.tabBadge, active && styles.active)}>
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
    <div className={styles.groupsWrap}>
      <div className={clsx('scroll', styles.groupsRow)}>
        {GROUPS.map(g => {
          const active = g.id === activeGroup.id;
          const badge = g.id === 'moderation' ? pendingReports : undefined;
          return (
            <Link key={g.id} href={g.tabs[0].href} className={clsx(styles.groupChip, active && styles.active)}>
              <Icon name={g.icon} size={14} stroke={active ? '#fff' : 'var(--ink-3)'} sw={1.8}/>
              {g.label}
              {!!badge && (
                <span className={clsx('mono', styles.groupBadge, active && styles.active)}>
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
