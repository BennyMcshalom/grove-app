'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { richText } from '@/lib/richText';
import { useNotifications, useMarkNotifRead, useMarkAllNotifsRead } from '@/hooks/useNotifications';
import { useSpaceStore } from '@/store/useSpaceStore';
import type { NotifRecord } from '@/lib/api';
import { formatRelativeTime } from '@/lib/mappers';

interface TopBarProps { title: string; dark?: boolean; }

// Per-type label, icon, and accent color — one place covering every
// notification type the backend actually emits, so nothing falls through to
// a raw enum string or a generic bell.
interface NotifMeta { label: string; icon: string; color: string; bg: string }

function notifMeta(n: NotifRecord): NotifMeta {
  const p = n.payload as Record<string, string>;
  switch (n.type) {
    case 'bond_invitation':
      return { label: `**${p.fromName ?? 'Someone'}** invited you into a Bond.`, icon: 'bonds', color: 'var(--ember-deep)', bg: 'var(--ember-dim)' };
    case 'circle_promoted':
      return { label: `You and **${p.otherName ?? 'a connection'}** just became a Bond.`, icon: 'sprout', color: 'var(--sage)', bg: 'var(--green-dim)' };
    case 'bond_anniversary':
      return { label: `Your Bond with **${p.otherName ?? 'a connection'}** hit a milestone.`, icon: 'sprout', color: 'var(--sage)', bg: 'var(--green-dim)' };
    case 'connection_request':
      return { label: `**${p.fromName ?? 'Someone'}** wants to connect.`, icon: 'bonds', color: 'var(--ember-deep)', bg: 'var(--ember-dim)' };
    case 'new_message':
      return { label: `New message from **${p.fromName ?? 'a Bond'}**.`, icon: 'comment', color: 'var(--slate)', bg: 'var(--slate-dim)' };
    case 'post_comment':
      return { label: `**${p.fromName ?? 'Someone'}** commented on your post.`, icon: 'comment', color: 'var(--sage)', bg: 'var(--green-dim)' };
    case 'post_reaction':
      return { label: `**${p.fromName ?? 'Someone'}** rooted your post${p.emoji ? ` ${p.emoji}` : ''}.`, icon: 'sprout', color: 'var(--ember)', bg: 'var(--ember-dim)' };
    case 'introduction':
      return { label: `**${p.introducerName ?? 'Someone'}** introduced you to **${p.otherName ?? 'someone'}**.`, icon: 'wave', color: 'var(--amber)', bg: 'var(--amber-dim)' };
    case 'proximity_wave':
    case 'wave':
      return { label: 'Someone nearby waved at you.', icon: 'pin', color: 'var(--amber)', bg: 'var(--amber-dim)' };
    case 'morning_curio':
      return { label: 'Your morning card is ready.', icon: 'sun', color: 'var(--amber)', bg: 'var(--amber-dim)' };
    case 'content_removed':
      return { label: 'One of your posts was removed for violating our guidelines.', icon: 'flag', color: 'var(--red)', bg: 'var(--red-dim)' };
    default:
      return { label: (p.message as string) ?? n.type, icon: 'bell', color: 'var(--ink-3)', bg: 'var(--surf-high)' };
  }
}

// Post-type notifications carry postId + spaceId — deep-link straight to
// that post instead of dumping the reader on the generic feed. Everything
// else routes to the page that shows it (no per-item deep link exists yet).
function notifHref(n: NotifRecord, slugById: (id: string) => string | undefined): string {
  const p = n.payload as Record<string, string>;
  switch (n.type) {
    case 'post_comment':
    case 'post_reaction': {
      const slug = p.spaceId ? slugById(p.spaceId) : undefined;
      return p.postId && slug ? `/spaces/${slug}?post=${p.postId}` : '/home';
    }
    case 'proximity_wave':
    case 'wave':          return '/nearby';
    case 'morning_curio': return '/morning';
    case 'content_removed': return '/archive';
    default:               return '/bonds';
  }
}

function groupByDay(items: NotifRecord[]): { label: string; items: NotifRecord[] }[] {
  const todayStr     = new Date().toDateString();
  const yesterdayStr = new Date(Date.now() - 86_400_000).toDateString();
  const buckets = new Map<string, NotifRecord[]>();
  for (const n of items) {
    const d = new Date(n.createdAt).toDateString();
    const label = d === todayStr ? 'Today' : d === yesterdayStr ? 'Yesterday' : 'Earlier';
    (buckets.get(label) ?? buckets.set(label, []).get(label)!).push(n);
  }
  return ['Today', 'Yesterday', 'Earlier']
    .filter(label => buckets.has(label))
    .map(label => ({ label, items: buckets.get(label)! }));
}

function NotifPanel({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { data: notifs, isLoading } = useNotifications();
  const { slugById } = useSpaceStore();
  const markRead = useMarkNotifRead();
  const markAll = useMarkAllNotifsRead();

  const items = notifs ?? [];
  const unreadCount = items.filter(n => !n.readAt).length;
  const groups = groupByDay(items);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 8000, background: 'rgba(26,26,26,.35)',
      display: 'flex', justifyContent: 'flex-end' }} onClick={onClose}>
      <div className="scroll" style={{ width: 400, maxWidth: '92vw', height: '100%', background: 'var(--white)',
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

        <div style={{ padding: '.8rem 1rem 1.4rem' }}>
          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><Spinner/></div>
          ) : items.length === 0 ? (
            <div className="card" style={{ background: 'linear-gradient(160deg, var(--amber-dim), var(--slate-dim))', margin: '.5rem' }}>
              <EmptyState variant="notifications"/>
            </div>
          ) : groups.map(group => (
            <div key={group.label} style={{ marginBottom: '.4rem' }}>
              <div className="label-mono" style={{ padding: '.6rem .4rem .5rem', color: 'var(--ink-4)' }}>
                {group.label}
              </div>
              {group.items.map(n => {
                const meta = notifMeta(n);
                const unread = !n.readAt;
                return (
                  <button key={n.id}
                    onClick={() => {
                      if (unread) markRead.mutate(n.id);
                      router.push(notifHref(n, slugById));
                      onClose();
                    }}
                    style={{ display: 'flex', width: '100%', textAlign: 'left', gap: '.8rem',
                      padding: '.8rem .7rem', borderRadius: 'var(--r-md)', marginBottom: 3,
                      background: unread ? 'var(--surf-low)' : 'transparent',
                      borderLeft: unread ? `3px solid ${meta.color}` : '3px solid transparent',
                      transition: 'background .15s' }}
                    onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--surf-low)')}
                    onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = unread ? 'var(--surf-low)' : 'transparent')}>
                    <span style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                      background: meta.bg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name={meta.icon} size={16} stroke={meta.color} sw={1.7}/>
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '.88rem', lineHeight: 1.5,
                        color: unread ? 'var(--ink)' : 'var(--ink-2)',
                        fontWeight: unread ? 500 : 400 }}>
                        {richText(meta.label)}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', marginTop: 3 }}>
                        <span className="mono" style={{ fontSize: '.66rem', color: 'var(--ink-4)' }}>
                          {formatRelativeTime(n.createdAt)}
                        </span>
                        {unread && (
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: meta.color, flexShrink: 0 }}/>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
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
      <header className={`app-topbar${dark ? ' app-topbar-dark' : ''}`} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '1.15rem 1.6rem .9rem', flexShrink: 0,
        background: dark ? 'var(--forest)' : 'var(--bg)',
        borderBottom: scrolled ? '1px solid var(--border)' : '1px solid transparent',
        boxShadow: scrolled ? 'var(--shadow-soft)' : 'none',
        transition: 'border-color .2s, box-shadow .2s',
      }}>
        <h1 className="serif app-topbar-title" style={{ fontSize: '1.9rem', fontWeight: 600, color: c,
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
          {/* Settings — only shown on mobile where the sidebar (with its own Settings/theme access) is hidden */}
          <button onClick={() => router.push('/settings')}
            className="mobile-settings-btn"
            style={{ width: 40, height: 40, borderRadius: '50%', display: 'none',
              alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="gear" size={18} stroke={sub}/>
          </button>
        </div>
      </header>
      {notifs && <NotifPanel onClose={() => setNotifs(false)}/>}
    </>
  );
}
