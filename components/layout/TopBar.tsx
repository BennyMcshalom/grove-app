'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/hooks/useTheme';
import { toggleTheme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { richText } from '@/lib/richText';
import { useNotifications, useMarkNotifRead, useMarkAllNotifsRead } from '@/hooks/useNotifications';
import type { NotifRecord } from '@/lib/api';

interface TopBarProps { title: string; dark?: boolean; }

function notifLabel(n: NotifRecord): string {
  const p = n.payload as Record<string, string>;
  switch (n.type) {
    case 'bond_invitation':   return `**${p.fromName ?? 'Someone'}** invited you into a Bond.`;
    case 'bond_anniversary':  return `Your Bond with **${p.otherName ?? 'a connection'}** hit a milestone.`;
    case 'connection_request':return `**${p.fromName ?? 'Someone'}** wants to connect.`;
    case 'wave':              return `Someone nearby waved at you.`;
    case 'morning_curio':     return 'Your morning card is ready.';
    case 'new_message':       return `New message from **${p.fromName ?? 'a Bond'}**.`;
    default:                  return p.message ?? n.type;
  }
}

function notifRoute(n: NotifRecord): string {
  switch (n.type) {
    case 'bond_invitation':
    case 'bond_anniversary':
    case 'new_message':   return '/bonds';
    case 'wave':          return '/nearby';
    case 'morning_curio': return '/morning';
    default:              return '/home';
  }
}

function NotifPanel({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { data: notifs, isLoading } = useNotifications();
  const markRead = useMarkNotifRead();
  const markAll = useMarkAllNotifsRead();

  const items = notifs ?? [];
  const unreadCount = items.filter(n => !n.readAt).length;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 8000, background: 'rgba(26,26,26,.35)',
      display: 'flex', justifyContent: 'flex-end' }} onClick={onClose}>
      <div className="scroll" style={{ width: 380, maxWidth: '92vw', height: '100%', background: 'var(--white)',
        overflowY: 'auto', animation: 'slideIn .28s ease both', borderLeft: '1px solid var(--border)' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ padding: '1.3rem 1.4rem', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', position: 'sticky', top: 0,
          background: 'var(--white)', borderBottom: '1px solid var(--border)' }}>
          <h2 className="serif" style={{ fontSize: '1.5rem', fontWeight: 600 }}>Notifications</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
            {unreadCount > 0 && (
              <button onClick={() => markAll.mutate()} disabled={markAll.isPending}
                style={{ fontSize: '.78rem', color: 'var(--ember)', fontWeight: 500 }}>
                Mark all read
              </button>
            )}
            <button onClick={onClose}
              style={{ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="close" stroke="var(--ink-3)"/>
            </button>
          </div>
        </div>

        <div style={{ padding: '.6rem' }}>
          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><Spinner/></div>
          ) : items.length === 0 ? (
            <div className="card" style={{ background: 'linear-gradient(160deg, var(--amber-dim), var(--slate-dim))', margin: '.5rem' }}>
              <EmptyState variant="notifications"/>
            </div>
          ) : items.map(n => (
            <button key={n.id}
              onClick={() => {
                if (!n.readAt) markRead.mutate(n.id);
                router.push(notifRoute(n));
                onClose();
              }}
              style={{ display: 'flex', width: '100%', textAlign: 'left', gap: '.8rem',
                padding: '.85rem .8rem', borderRadius: 'var(--r-md)', marginBottom: 2,
                background: !n.readAt ? 'var(--ember-dim)' : 'transparent' }}
              onMouseEnter={e => { if (n.readAt) (e.currentTarget as HTMLElement).style.background = 'var(--surf-low)'; }}
              onMouseLeave={e => { if (n.readAt) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
              <span style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                background: !n.readAt ? 'var(--ember-soft)' : 'var(--surf-high)',
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon
                  name={
                    n.type === 'bond_invitation' ? 'bonds' :
                    n.type === 'wave'            ? 'pin' :
                    n.type === 'morning_curio'   ? 'sun' :
                    n.type === 'new_message'     ? 'comment' :
                    n.type === 'bond_anniversary'? 'sprout' : 'bell'
                  }
                  size={15}
                  stroke={!n.readAt ? 'var(--ember-deep)' : 'var(--ink-3)'}
                  sw={1.6}
                />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '.88rem', lineHeight: 1.5,
                  color: !n.readAt ? 'var(--ink)' : 'var(--ink-2)',
                  fontWeight: !n.readAt ? 500 : 400 }}>
                  {richText(notifLabel(n))}
                </p>
                <div className="mono" style={{ fontSize: '.66rem', color: 'var(--ink-4)', marginTop: 3 }}>
                  {new Date(n.createdAt).toLocaleDateString()}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Play a soft two-tone chime using Web Audio API — no audio file needed */
function playNotifSound() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const tones = [880, 1100];
    tones.forEach((freq, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = ctx.currentTime + i * 0.12;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.18, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.28);
      osc.start(start);
      osc.stop(start + 0.28);
    });
  } catch {}
}

export function TopBar({ title, dark }: TopBarProps) {
  const router = useRouter();
  const [notifs, setNotifs] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const theme = useTheme();
  const isDark = theme === 'dark';

  // Listen to the scrollable content area below this header
  useEffect(() => {
    const el = document.querySelector('.app-content');
    if (!el) return;
    const onScroll = () => setScrolled(el.scrollTop > 10);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);
  const { data: notifData } = useNotifications();
  const unread = (notifData ?? []).filter(n => !n.readAt).length;
  const prevUnread = useRef(unread);

  // Play sound when unread count increases
  useEffect(() => {
    if (unread > prevUnread.current) playNotifSound();
    prevUnread.current = unread;
  }, [unread]);

  const c   = dark ? 'rgba(250,250,248,.92)' : 'var(--ink)';
  const sub = dark ? 'rgba(250,250,248,.55)' : 'var(--ink-3)';

  return (
    <>
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '1.15rem 1.6rem .9rem', flexShrink: 0,
        background: dark ? 'var(--forest)' : 'var(--bg)',
        borderBottom: scrolled ? '1px solid var(--border)' : '1px solid transparent',
        boxShadow: scrolled ? 'var(--shadow-soft)' : 'none',
        transition: 'border-color .2s, box-shadow .2s',
      }}>
        <h1 className="serif" style={{ fontSize: '1.9rem', fontWeight: 600, color: c,
          letterSpacing: '.005em', whiteSpace: 'nowrap' }}>{title}</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.3rem' }}>
          <button onClick={() => router.push('/search')}
            style={{ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="search" stroke={sub}/>
          </button>
          <button onClick={() => setNotifs(true)}
            style={{ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <Icon name="bell" stroke={sub}/>
            {unread > 0 && (
              <span style={{ position: 'absolute', top: 7, right: 8, width: 7, height: 7,
                borderRadius: '50%', background: 'var(--ember)', border: '2px solid var(--white)' }}/>
            )}
          </button>
          {/* Theme toggle — only shown on mobile where sidebar toggle is hidden */}
          <button onClick={toggleTheme}
            className="mobile-theme-btn"
            style={{ width: 40, height: 40, borderRadius: '50%', display: 'none',
              alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={isDark ? 'sun' : 'moon'} size={18} stroke={sub}/>
          </button>
        </div>
      </header>
      {notifs && <NotifPanel onClose={() => setNotifs(false)}/>}
    </>
  );
}
