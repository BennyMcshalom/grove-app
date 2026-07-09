'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { Avatar } from '@/components/ui/Avatar';
import { Logo } from '@/components/ui/Logo';
import { useUserStore } from '@/store/useUserStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useBonds } from '@/hooks/useBonds';
import { spaceById } from '@/lib/data';
import { useTheme } from '@/hooks/useTheme';
import { toggleTheme } from '@/lib/theme';

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useUserStore();
  const theme = useTheme();
  const isDark = theme === 'dark';
  const { isInitialized, user: authUser } = useAuthStore();
  const isAdmin = authUser?.roles.includes('admin') ?? false;
  const { data: bondsData } = useBonds();
  const bondCount = bondsData?.length ?? 0;

  const firstSpace = user.spaces[0];
  const spaceLabel = firstSpace
    ? user.stageLabels?.[firstSpace] || spaceById(firstSpace).name
    : 'Your chapter';

  const NAV = [
    { id: 'home',    href: '/home',    label: 'Home',         icon: 'home' },
    { id: 'spaces',  href: '/spaces',  label: 'My Spaces',    icon: 'spaces' },
    { id: 'log',     href: '/log',     label: 'Grouv Log',    icon: 'book' },
    { id: 'bonds',   href: '/bonds',   label: 'Bonds',        icon: 'bonds', badge: isInitialized ? bondCount : null },
    { id: 'morning', href: '/morning', label: 'Morning Room', icon: 'sun' },
    { id: 'nearby',  href: '/nearby',  label: 'Nearby',       icon: 'pin', heartbeat: true },
    { id: 'archive', href: '/archive', label: 'Archive',      icon: 'archive' },
    { id: 'stats',   href: '/stats',   label: 'Stats',        icon: 'stats' },
  ];

  return (
    <aside style={{ width: 262, flexShrink: 0, background: 'var(--white)',
      borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column',
      padding: '1.4rem 1rem 1rem', height: '100vh' }}>
      <div style={{ padding: '0 .5rem .6rem' }}><Logo size={22}/></div>

      <Link href="/profile" style={{ display: 'flex', alignItems: 'center', gap: '.7rem',
        padding: '.7rem .55rem', borderRadius: 'var(--r-md)', textAlign: 'left', marginBottom: '.6rem',
        transition: 'background .15s', textDecoration: 'none' }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--surf-low)'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
        <Avatar name={user.name} size={42} avatarUrl={user.avatar_url}/>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: '.92rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
          <div style={{ fontSize: '.7rem', color: 'var(--ink-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{spaceLabel}</div>
        </div>
      </Link>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
        {NAV.map(item => {
          const active = pathname.startsWith(item.href);
          return (
            <Link key={item.id} href={item.href}
              style={{ display: 'flex', alignItems: 'center', gap: '.75rem', padding: '.62rem .7rem',
                borderRadius: 'var(--r-md)', fontSize: '.9rem', fontWeight: 500, textDecoration: 'none',
                color: active ? 'var(--ember)' : 'var(--ink-2)',
                background: active ? 'var(--ember-dim)' : 'transparent', transition: 'background .15s, color .15s' }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--surf-low)'; }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
              <Icon name={item.icon} stroke={active ? 'var(--ember)' : 'var(--ink-3)'}/>
              <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>
              {item.heartbeat && user.proximity && (
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--sage)', animation: 'pulseDot 1.4s ease infinite' }}/>
              )}
              {item.badge != null && item.badge > 0 && (
                <span className="mono" style={{ marginLeft: 'auto', fontSize: '.62rem',
                  background: active ? 'var(--ember)' : 'var(--surf-high)',
                  color: active ? '#fff' : 'var(--ink-3)', padding: '.1rem .42rem', borderRadius: 100 }}>
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}

        {isAdmin && (
          <>
            <div style={{ height: 1, background: 'var(--border)', margin: '.5rem .7rem' }}/>
            <Link href="/admin" style={{ display: 'flex', alignItems: 'center', gap: '.75rem', padding: '.62rem .7rem',
              borderRadius: 'var(--r-md)', fontSize: '.9rem', fontWeight: 500, textDecoration: 'none',
              color: pathname.startsWith('/admin') ? 'var(--ember)' : 'var(--ink-2)',
              background: pathname.startsWith('/admin') ? 'var(--ember-dim)' : 'transparent', transition: 'background .15s, color .15s' }}
              onMouseEnter={e => { if (!pathname.startsWith('/admin')) (e.currentTarget as HTMLElement).style.background = 'var(--surf-low)'; }}
              onMouseLeave={e => { if (!pathname.startsWith('/admin')) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
              <Icon name="shield" stroke={pathname.startsWith('/admin') ? 'var(--ember)' : 'var(--ink-3)'}/>
              <span style={{ whiteSpace: 'nowrap' }}>Admin</span>
            </Link>
          </>
        )}
      </nav>

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '.7rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {/* Subscribe / trial */}
        <Link href="/subscribe" style={{ display: 'flex', alignItems: 'center', gap: '.55rem',
          padding: '.6rem .7rem', borderRadius: 'var(--r-md)', textDecoration: 'none',
          background: 'var(--ember)', boxShadow: '0 2px 10px -2px rgba(243,112,30,.45)' }}>
          <Icon name="sprout" size={16} stroke="#fff"/>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: '.78rem', color: '#fff' }}>Start 14-day trial</div>
            <div style={{ fontSize: '.66rem', color: 'rgba(255,255,255,.8)' }}>Full access, free</div>
          </div>
        </Link>
        {/* Theme toggle */}
        <button onClick={toggleTheme}
          style={{ display: 'flex', alignItems: 'center', gap: '.6rem',
            padding: '.55rem .7rem', borderRadius: 'var(--r-md)', fontSize: '.85rem', color: 'var(--ink-2)',
            width: '100%', textAlign: 'left', transition: 'background .15s' }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--surf-low)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
          <Icon name={isDark ? 'sun' : 'moon'} size={17} stroke="var(--ink-3)"/>
          {isDark ? 'Light mode' : 'Dark mode'}
        </button>
        <Link href="/deep-focus" style={{ display: 'flex', alignItems: 'center', gap: '.6rem',
          padding: '.55rem .7rem', borderRadius: 100, fontSize: '.8rem', color: 'var(--ink-3)',
          background: 'var(--surf-low)', textDecoration: 'none' }}>
          <Icon name="focus" size={16} stroke="var(--ink-3)"/> Deep Focus
        </Link>
        <Link href="/settings" style={{ display: 'flex', alignItems: 'center', gap: '.6rem',
          padding: '.55rem .7rem', borderRadius: 'var(--r-md)', fontSize: '.85rem', color: 'var(--ink-2)',
          textDecoration: 'none', transition: 'background .15s' }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--surf-low)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
          <Icon name="gear" size={17} stroke="var(--ink-3)"/> Settings
        </Link>
      </div>
    </aside>
  );
}
