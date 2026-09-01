'use client';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useBondMessages } from '@/hooks/useBonds';
import { startCall } from '@/lib/calling';
import { humanDuration } from '@/lib/mappers';
import type { BondRecord } from '@/lib/api';
import styles from './BondInfoPanel.module.css';

export function BondInfoPanel({ bond, onClose }: { bond: BondRecord; onClose: () => void }) {
  const router = useRouter();
  const other = bond.otherUser;
  const name = other?.displayName ?? 'Bond';
  const isBond = bond.status === 'bond';

  // Same query key BondThread already subscribes to — TanStack Query dedupes it.
  const { data: messages } = useBondMessages(bond.id);
  const voiceCount = messages?.filter(m => m.kind === 'voice').length ?? 0;
  const sharedCount = messages?.filter(m => m.kind === 'shared_post').length ?? 0;

  const focusEndsLabel = other?.deepFocusEndsAt
    ? `Ends ${new Date(other.deepFocusEndsAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
    : null;

  return (
    <div className={styles.panel}>
      <header className={styles.header}>
        <span className="label-mono">Bond Info</span>
        <button onClick={onClose} className={styles.closeBtn}>
          <Icon name="close" size={16} stroke="var(--ink-3)" />
        </button>
      </header>

      <div className={clsx('scroll', styles.scrollBody)}>
        <button onClick={() => other?.id && router.push(`/grove/${other.id}`)} title="Enter their Grouv">
          <Avatar name={name} size={92} ring={isBond ? 3 : undefined} aura={other?.aura ?? undefined} avatarUrl={other?.avatarUrl} style={{ margin: '0 auto' }} />
        </button>
        <h2 className={clsx('serif', styles.name)}>{name}</h2>
        {other?.openTo && <p className={styles.openTo}>{other.openTo}</p>}

        <div className={styles.chipsRow}>
          <span className={clsx('chip', isBond && styles.bondChip, isBond && styles.active)}>
            {isBond ? 'Bond' : 'Circle'}
          </span>
          <span className="chip">
            <Icon name="fire" size={12} stroke="currentColor" /> {bond.streakDays ?? 0}d streak
          </span>
        </div>

        {isBond && (
          <div className={styles.depthSection}>
            <div className={styles.depthHeader}>
              <span className={clsx('label-mono', styles.depthLabel)}>Bond depth</span>
              <span className={styles.depthAge}>{humanDuration(bond.formedAt)} old</span>
            </div>
            <ProgressBar value={bond.depthScore ?? 0} />
          </div>
        )}

        {bond.originLabel && <p className={styles.originLabel}>{bond.originLabel}</p>}

        {other?.deepFocusActive && (
          <div className={styles.focusBanner}>
            <Icon name="moon" size={14} stroke="var(--cream)" sw={1.8} />
            <div>
              <div className={styles.focusBannerTitle}>In Deep Focus</div>
              {focusEndsLabel && <div className={styles.focusBannerSub}>{focusEndsLabel}</div>}
            </div>
          </div>
        )}

        <div className={styles.callRow}>
          <button onClick={() => startCall(bond, 'voice')} className={clsx('btn', 'btn-soft', styles.callBtn)}>
            <Icon name="phone" size={15} stroke="currentColor" /> Voice
          </button>
          <button onClick={() => startCall(bond, 'video')} className={clsx('btn', 'btn-soft', styles.callBtn)}>
            <Icon name="video" size={15} stroke="currentColor" /> Video
          </button>
        </div>

        {(voiceCount > 0 || sharedCount > 0) && (
          <div className={styles.sharedSection}>
            <div className={clsx('label-mono', styles.sharedLabel)}>Shared</div>
            <div className={styles.sharedRow}>
              <div className={clsx('card', styles.statCard)}>
                <Icon name="mic" size={16} stroke="var(--ink-3)" />
                <div className={styles.statNum}>{voiceCount}</div>
                <div className={styles.statLabel}>Voice notes</div>
              </div>
              <div className={clsx('card', styles.statCard)}>
                <Icon name="share" size={16} stroke="var(--ink-3)" />
                <div className={styles.statNum}>{sharedCount}</div>
                <div className={styles.statLabel}>Shared posts</div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className={styles.footer}>
        {isBond ? (
          <button onClick={() => router.push(`/bond-release?bond=${encodeURIComponent(name)}&bondId=${bond.id}`)}
            className={clsx('btn', 'btn-ghost', styles.releaseBtn)}>
            Release this Bond
          </button>
        ) : (
          <p className={styles.footerNote}>
            Bonds form after 7 days of consistently showing up for each other.
          </p>
        )}
      </div>
    </div>
  );
}
