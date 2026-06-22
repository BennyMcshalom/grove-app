'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/admin',          label: 'Overview' },
  { href: '/admin/users',    label: 'Users' },
  { href: '/admin/waitlist', label: 'Waitlist' },
  { href: '/admin/audit',    label: 'Audit log' },
];

export function AdminSubNav() {
  const pathname = usePathname();
  return (
    <div className="scroll" style={{ display: 'flex', gap: '1.4rem', borderBottom: '1px solid var(--border)',
      marginBottom: '1.6rem', overflowX: 'auto' }}>
      {TABS.map(t => {
        const active = t.href === '/admin' ? pathname === '/admin' : pathname.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href}
            style={{ paddingBottom: '.7rem', fontSize: '.92rem', fontWeight: active ? 600 : 500,
              color: active ? 'var(--ember)' : 'var(--ink-3)', whiteSpace: 'nowrap', flexShrink: 0,
              borderBottom: active ? '2px solid var(--ember)' : '2px solid transparent', marginBottom: -1,
              textDecoration: 'none', transition: 'color .15s' }}>
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
