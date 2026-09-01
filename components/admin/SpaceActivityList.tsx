'use client';
import clsx from 'clsx';
import { Spinner } from '@/components/ui/Spinner';
import type { useAdminSpaceStats } from '@/hooks/useAdmin';
import styles from './SpaceActivityList.module.css';

export function SpaceActivityList({ spaces, loading }: {
  spaces: ReturnType<typeof useAdminSpaceStats>['data'];
  loading: boolean;
}) {
  const maxSpacePosts = Math.max(1, ...(spaces ?? []).map(s => s.postCount));

  return (
    <div className={clsx('card', styles.card)}>
      <div className={clsx('label-mono', styles.title)}>Most active spaces</div>
      {loading ? (
        <div className={styles.loadingWrap}><Spinner size={18} /></div>
      ) : (
        <div className={styles.list}>
          {(spaces ?? []).map(s => (
            <div key={s.id} className={styles.row}>
              <span className={styles.dot} style={{ background: s.colorHex }} />
              <div className={styles.name}>{s.name}</div>
              <div className={styles.barTrack}>
                <div className={styles.barFill} style={{
                  width: `${(s.postCount / maxSpacePosts) * 100}%`,
                  background: s.colorHex,
                }} />
              </div>
              <div className={styles.count}>
                {s.postCount} posts
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
