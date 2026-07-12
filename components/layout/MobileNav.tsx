'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { useAuthStore } from '@/store/useAuthStore';
import { useBonds } from '@/hooks/useBonds';

const NAV = [
  { href: '/home',     icon: 'home',    label: 'Home'   },
  { href: '/spaces',   icon: 'spaces',  label: 'Spaces' },
  { href: '/log',      icon: 'book',    label: 'Log'    },
  { href: '/bonds',    icon: 'bonds',   label: 'Bonds'  },
  { href: '/nearby',   icon: 'pin',     label: 'Nearby' },
];

const ADMIN_ITEM = { href: '/admin', icon: 'shield', label: 'Admin' };

export function MobileNav() {
  const pathname = usePathname();
  const { isInitialized, user } = useAuthStore();
  const isAdmin = user?.roles.some(r => r === 'admin' || r === 'moderator') ?? false;
  const { data: bondsData } = useBonds();
  const bondCount = bondsData?.length ?? 0;
  const items = isAdmin ? [...NAV, ADMIN_ITEM] : NAV;

  return (
    <nav className="app-mobile-nav">
      {items.map(item => {
        const active = pathname.startsWith(item.href);
        const showBadge = item.href === '/bonds' && isInitialized && bondCount > 0;
        return (
          <Link key={item.href} href={item.href}
            className={`mob-nav-item${active ? ' active' : ''}`}>
            <div style={{ position: 'relative' }}>
              <Icon
                name={item.icon}
                size={22}
                stroke={active ? 'var(--ember)' : 'var(--ink-3)'}
                sw={active ? 2 : 1.6}
              />
              {showBadge && (
                <span style={{ position: 'absolute', top: -3, right: -4,
                  width: 8, height: 8, borderRadius: '50%',
                  background: 'var(--ember)', border: '1.5px solid var(--white)' }}/>
              )}
            </div>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
