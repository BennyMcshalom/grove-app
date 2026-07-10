'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAdminStats } from '@/hooks/useAdmin';
import { useAuthStore } from '@/store/useAuthStore';

const STAFF_TABS = [
  { href: '/admin/reports',  label: 'Reports' },
  { href: '/admin/search',   label: 'Content search' },
  { href: '/admin/groups',   label: 'Groups' },
];

const ADMIN_ONLY_TABS = [
  { href: '/admin',              label: 'Overview' },
  { href: '/admin/users',        label: 'Users' },
  { href: '/admin/waitlist',     label: 'Waitlist' },
  { href: '/admin/billing',      label: 'Billing' },
  { href: '/admin/feature-flags', label: 'Feature flags' },
  { href: '/admin/email-log',    label: 'Email log' },
  { href: '/admin/audit',        label: 'Audit log' },
];

export function AdminSubNav() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const isAdmin = user?.roles.includes('admin') ?? false;
  const { data: stats } = useAdminStats(isAdmin);

  const TABS = isAdmin
    ? [ADMIN_ONLY_TABS[0], ...STAFF_TABS, ...ADMIN_ONLY_TABS.slice(1)]
    : STAFF_TABS;

  return (
    <div className="scroll" style={{ display: 'flex', gap: '1.4rem', borderBottom: '1px solid var(--border)',
      marginBottom: '1.6rem', overflowX: 'auto' }}>
      {TABS.map(t => {
        const active = t.href === '/admin' ? pathname === '/admin' : pathname.startsWith(t.href);
        const badge = t.href === '/admin/reports' ? stats?.pendingReports : undefined;
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
