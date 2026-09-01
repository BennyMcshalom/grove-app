'use client';
import clsx from 'clsx';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { formatRelativeTime, isOnline } from '@/lib/mappers';
import type { BondRecord } from '@/lib/api';
import styles from './BondListRow.module.css';

export function BondListRow({ bond, active, onClick }: {
  bond: BondRecord; active: boolean; onClick: () => void;
}) {
  const name = bond.otherUser?.displayName ?? 'Bond';
  const inFocus = !!bond.otherUser?.deepFocusActive;
  const online = isOnline(bond.otherUser?.lastActiveAt);
  const unread = bond.unreadCount ?? 0;

  return (
    <button onClick={onClick} className={clsx('card', styles.row, active && styles.active)}>
      <div className={styles.header}>
        <div className={styles.avatarWrap}>
          <Avatar name={name} size={48} aura={bond.otherUser?.aura ?? undefined} avatarUrl={bond.otherUser?.avatarUrl} dot={online && !inFocus} />
          {inFocus && (
            <div title="In Deep Focus" className={styles.focusBadge}>
              <Icon name="moon" size={9} stroke="var(--cream)" sw={1.8} />
            </div>
          )}
        </div>
        <div className={styles.nameCol}>
          <div className={styles.nameRow}>
            <span className={styles.name}>{name}</span>
            <span className={styles.time}>{bond.lastMessageAt ? formatRelativeTime(bond.lastMessageAt) : 'new'}</span>
          </div>
          <div className={styles.statusRow}>
            {inFocus ? (
              <span className={styles.statusFocus}>in focus</span>
            ) : (
              <span className={styles.statusText}>{bond.otherUser?.openTo || 'No messages yet'}</span>
            )}
            {unread > 0 && <span className={styles.unreadBadge}>{unread}</span>}
          </div>
        </div>
      </div>
      <div className={styles.depthRow}>
        <span className={clsx('label-mono', styles.depthLabel)}>Depth</span>
        <div className={styles.depthBarWrap}><ProgressBar value={bond.depthScore ?? 0} /></div>
      </div>
    </button>
  );
}
