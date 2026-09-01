'use client';
import clsx from 'clsx';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { formatRelativeTime, formatLastSeen, isOnline } from '@/lib/mappers';
import type { BondRecord } from '@/lib/api';
import styles from './CircleRow.module.css';

export function CircleRow({ bond, active, onClick, showDivider }: {
  bond: BondRecord; active: boolean; onClick: () => void; showDivider: boolean;
}) {
  const name = bond.otherUser?.displayName ?? 'Circle';
  const streak = bond.streakDays ?? 0;
  const pct = Math.min(100, Math.round((streak / 7) * 100));
  const unread = bond.unreadCount ?? 0;
  const inFocus = !!bond.otherUser?.deepFocusActive;
  const online = isOnline(bond.otherUser?.lastActiveAt);

  return (
    <button onClick={onClick} className={clsx(styles.row, active && styles.active, showDivider && styles.divider)}>
      <div className={styles.header}>
        <div className={styles.avatarWrap}>
          <Avatar name={name} size={40} avatarUrl={bond.otherUser?.avatarUrl} aura={bond.otherUser?.aura ?? undefined} dot={online && !inFocus} />
          {inFocus && (
            <div title="In Deep Focus" className={styles.focusBadge}>
              <Icon name="moon" size={7} stroke="var(--cream)" sw={1.8} />
            </div>
          )}
        </div>
        <div className={styles.nameCol}>
          <div className={styles.name}>{name}</div>
          <div className={styles.status}>{inFocus ? 'in focus' : (bond.otherUser?.openTo || ' ')}</div>
        </div>
        <div className={styles.metaCol}>
          <div className={styles.time}>{bond.lastMessageAt ? formatRelativeTime(bond.lastMessageAt) : 'new'}</div>
          {unread > 0 && <span className={styles.unreadBadge}>{unread}</span>}
        </div>
      </div>
      {/* Streak — fills toward the 7-day Bond threshold */}
      <div className={styles.streakRow}>
        <div className={styles.streakTrack}>
          <div className={styles.streakFill} style={{ width: `${pct}%`, background: pct >= 85 ? 'var(--sage)' : 'var(--ink-4)' }} />
        </div>
        <span className={styles.lastSeen}>{formatLastSeen(bond.otherUser?.lastActiveAt)}</span>
      </div>
    </button>
  );
}
