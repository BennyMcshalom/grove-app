'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { richText } from '@/lib/richText';
import { useNotifications, useMarkNotifRead, useMarkAllNotifsRead, useClearAllNotifs } from '@/hooks/useNotifications';
import { useSpaceStore } from '@/store/useSpaceStore';
import type { NotifRecord } from '@/lib/api';
import { formatRelativeTime } from '@/lib/mappers';
import styles from './TopBar.module.css';

interface TopBarProps {
  title: string;
  dark?: boolean;
}

interface NotifMeta {
  title: string;
  label: string;
  icon: string;
  color: string;
  bg: string;
}

function notifMeta(n: NotifRecord): NotifMeta {
  const p = n.payload as Record<string, string>;
  switch (n.type) {
    case 'bond_invitation':
      return { title: 'You have a new Bond invitation', label: `**${p.fromName ?? 'Someone'}** invited you into a Bond.`, icon: 'bonds', color: 'var(--ember-deep)', bg: 'var(--ember-dim)' };
    case 'circle_promoted':
      return { title: 'You formed a new Bond', label: `You and **${p.otherName ?? 'a connection'}** just became a Bond.`, icon: 'sprout', color: 'var(--sage)', bg: 'var(--green-dim)' };
    case 'bond_anniversary':
      return { title: 'A Bond milestone was reached', label: `Your Bond with **${p.otherName ?? 'a connection'}** hit a milestone.`, icon: 'sprout', color: 'var(--sage)', bg: 'var(--green-dim)' };
    case 'connection_request':
      return { title: 'We found someone you might connect with', label: `**${p.fromName ?? 'Someone'}** wants to connect.`, icon: 'bonds', color: 'var(--ember-deep)', bg: 'var(--ember-dim)' };
    case 'new_message':
      return { title: 'You have a new message', label: `New message from **${p.fromName ?? 'a Bond'}**.`, icon: 'comment', color: 'var(--slate)', bg: 'var(--slate-dim)' };
    case 'post_comment':
      return { title: 'New comment on your post', label: `**${p.fromName ?? 'Someone'}** commented on your post.`, icon: 'comment', color: 'var(--sage)', bg: 'var(--green-dim)' };
    case 'post_reaction':
      return { title: 'Someone rooted your post', label: `**${p.fromName ?? 'Someone'}** rooted your post${p.emoji ? ` ${p.emoji}` : ''}.`, icon: 'sprout', color: 'var(--ember)', bg: 'var(--ember-dim)' };
    case 'introduction':
      return { title: 'You were introduced to someone', label: `**${p.introducerName ?? 'Someone'}** introduced you to **${p.otherName ?? 'someone'}**.`, icon: 'wave', color: 'var(--amber)', bg: 'var(--amber-dim)' };
    case 'proximity_wave':
    case 'wave':
      return { title: 'Someone waved at you nearby', label: 'Someone nearby waved at you.', icon: 'pin', color: 'var(--amber)', bg: 'var(--amber-dim)' };
    case 'morning_curio':
      return { title: 'Your morning card is ready', label: "Open it while it's still fresh.", icon: 'sun', color: 'var(--amber)', bg: 'var(--amber-dim)' };
    case 'content_removed':
      return { title: 'A post was removed', label: 'One of your posts was removed for violating our guidelines.', icon: 'flag', color: 'var(--red)', bg: 'var(--red-dim)' };
    default:
      return { title: 'Notification', label: (p.message as string) ?? n.type, icon: 'bell', color: 'var(--ink-3)', bg: 'var(--surf-high)' };
  }
}

function notifHref(n: NotifRecord, slugById: (id: string) => string | undefined): string {
  const p = n.payload as Record<string, string>;
  switch (n.type) {
    case 'post_comment':
    case 'post_reaction': {
      const slug = p.spaceId ? slugById(p.spaceId) : undefined;
      return p.postId && slug ? `/spaces/${slug}?post=${p.postId}` : '/home';
    }
    case 'proximity_wave':
    case 'wave':
      return '/nearby';
    case 'morning_curio':
      return '/morning';
    case 'content_removed':
      return '/archive';
    default:
      return '/bonds';
  }
}

function NotifPanel({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { data: notifs, isLoading } = useNotifications();
  const { slugById } = useSpaceStore();
  const markRead = useMarkNotifRead();
  const markAll = useMarkAllNotifsRead();
  const clearAll = useClearAllNotifs();

  const items = notifs ?? [];
  const unreadCount = items.filter(n => !n.readAt).length;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={e => e.stopPropagation()}>
        <div className={styles.panelHeader}>
          <div>
            <h2 className={styles.panelTitle}>Notifications</h2>
            {unreadCount > 0 && (
              <button onClick={() => markAll.mutate()} disabled={markAll.isPending} className={styles.markAllBtn}>
                Mark all read
              </button>
            )}
          </div>
          <button onClick={onClose} className={styles.panelCloseBtn}>
            <Icon name="close" size={22} />
          </button>
        </div>

        <div className={clsx('scroll', styles.panelBody)}>
          {isLoading ? (
            <div className={styles.loadingWrap}><Spinner /></div>
          ) : items.length === 0 ? (
            <div className={styles.emptyCard}>
              <EmptyState
                variant="notifications"
                image="/media/notifications-empty.png"
                title="No Notifications"
                body="Notification Inbox Empty"
              />
            </div>
          ) : (
            items.map(n => {
              const meta = notifMeta(n);
              const unread = !n.readAt;
              return (
                <button
                  key={n.id}
                  onClick={() => {
                    if (unread) markRead.mutate(n.id);
                    router.push(notifHref(n, slugById));
                    onClose();
                  }}
                  className={styles.notifCard}
                >
                  {unread && <span className={styles.unreadDot} style={{ background: meta.color }} />}
                  <span className={styles.notifIcon} style={{ background: meta.bg }}>
                    <Icon name={meta.icon} size={20} stroke={meta.color} sw={1.7} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className={styles.notifTitle}>{meta.title}</p>
                    <p className={styles.notifLabel}>{richText(meta.label)}</p>
                    <span className={styles.notifTime}>{formatRelativeTime(n.createdAt)}</span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className={styles.panelFooter}>
          <button
            onClick={() => items.length > 0 && clearAll.mutate(items.map(n => n.id))}
            disabled={clearAll.isPending}
            className="btn btn-primary btn-block btn-pill"
          >
            {clearAll.isPending ? 'Clearing…' : 'Clear Notifications'}
          </button>
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
      const osc = ctx.createOscillator();
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

// Bell icon + unread dot + notification-sound effect + slide-in panel.
// Standalone so it can sit inside TopBar or any other header (e.g. Home's
// shared header row above the main+right columns).
export function NotifBell({ dark }: { dark?: boolean }) {
  const [notifs, setNotifs] = useState(false);
  const { data: notifData } = useNotifications();
  const unread = (notifData ?? []).filter(n => !n.readAt).length;
  const prevUnread = useRef(unread);

  useEffect(() => {
    if (unread > prevUnread.current) playNotifSound();
    prevUnread.current = unread;
  }, [unread]);

  return (
    <>
      <button onClick={() => setNotifs(true)} className={clsx(styles.bellBtn, dark && styles.dark)}>
        <Icon name="bell" />
        {unread > 0 && <span className={styles.bellDot} />}
      </button>
      {notifs && <NotifPanel onClose={() => setNotifs(false)} />}
    </>
  );
}

export function TopBar({ title, dark }: TopBarProps) {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);

  // Listen to the scrollable content area below this header
  useEffect(() => {
    const el = document.querySelector('.app-content');
    if (!el) return;
    const onScroll = () => setScrolled(el.scrollTop > 10);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={clsx(`app-topbar${dark ? ' app-topbar-dark' : ''}`, styles.topbar, dark && styles.dark, scrolled && styles.scrolled)}>
      <h1 className={clsx('serif', 'app-topbar-title', styles.title, dark && styles.dark)}>{title}</h1>
      <div className={styles.iconsRow}>
        <button onClick={() => router.push('/search')} className={clsx(styles.iconBtn, dark && styles.dark)}>
          <Icon name="search" />
        </button>
        <NotifBell dark={dark} />
        {/* Settings — only shown on mobile where the sidebar (with its own Settings/theme access) is hidden */}
        <button onClick={() => router.push('/settings')} className={clsx('mobile-settings-btn', styles.settingsBtn, dark && styles.dark)}>
          <Icon name="gear" size={18} />
        </button>
      </div>
    </header>
  );
}
