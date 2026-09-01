'use client';
import clsx from 'clsx';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import type { AdminGroup, AdminGroupPost } from '@/lib/api';
import styles from './GroupCard.module.css';

export function GroupCard({ g, isOpen, onToggle, posts, postsLoading,
  removeMemberId, setRemoveMemberId, onRemoveMember, removeMemberPending,
  onRemovePost, removePostPending,
  confirming, onRequestDisband, onConfirmDisband, onCancelDisband, disbandPending }: {
  g: AdminGroup;
  isOpen: boolean; onToggle: () => void;
  posts: AdminGroupPost[] | undefined; postsLoading: boolean;
  removeMemberId: string; setRemoveMemberId: (v: string) => void;
  onRemoveMember: () => void; removeMemberPending: boolean;
  onRemovePost: (postId: string) => void; removePostPending: boolean;
  confirming: boolean; onRequestDisband: () => void; onConfirmDisband: () => void; onCancelDisband: () => void;
  disbandPending: boolean;
}) {
  return (
    <div className={clsx('card', styles.card)}>
      <button onClick={onToggle} className={styles.headerBtn}>
        <span className={styles.emojiCircle} style={{ background: g.coverColor }}>
          {g.emoji}
        </span>
        <div className={styles.info}>
          <div className={styles.name}>{g.name}</div>
          <div className={styles.meta}>
            {g.memberCount} members · {g.postCount} posts · {g.lifePhase}
            {g.isSeeded && ' · default'}
          </div>
        </div>
        <span className={clsx(styles.arrowWrap, isOpen && styles.open)}>
          <Icon name="arrow" size={16} stroke="var(--ink-4)"/>
        </span>
      </button>

      {isOpen && (
        <div className={clsx('fade-in', styles.body)}>
          <div className={styles.removeMemberRow}>
            <input value={removeMemberId} onChange={e => setRemoveMemberId(e.target.value)}
              placeholder="User id to remove from group…"
              className={styles.removeMemberInput}/>
            <button onClick={onRemoveMember} disabled={removeMemberPending || !removeMemberId.trim()}
              className={clsx('btn', 'btn-soft', styles.removeMemberBtn)}>
              {removeMemberPending ? <Spinner size={12}/> : 'Remove member'}
            </button>
          </div>

          <div className={clsx('label-mono', styles.postsLabel)}>Recent posts</div>
          {postsLoading ? (
            <div className={styles.postsLoadingWrap}><Spinner size={16}/></div>
          ) : !posts?.length ? (
            <p className={styles.emptyPosts}>No posts in this group yet.</p>
          ) : (
            <div className={styles.postsList}>
              {posts.map(p => (
                <div key={p.id} className={styles.postRow}>
                  <div className={styles.postBody}>
                    <div className={styles.postAuthor}>{p.authorName}</div>
                    <div className={styles.postContent}>{p.content}</div>
                  </div>
                  <button onClick={() => onRemovePost(p.id)} disabled={removePostPending}
                    title="Remove post" className={styles.postRemoveBtn}>
                    <Icon name="close" size={15} stroke="var(--red)"/>
                  </button>
                </div>
              ))}
            </div>
          )}

          {!g.isSeeded && (
            confirming ? (
              <div className={styles.confirmWrap}>
                <span className={styles.confirmText}>Disband this group?</span>
                <button onClick={onConfirmDisband} disabled={disbandPending}
                  className={clsx('btn', 'btn-primary', styles.dangerBtn)}>
                  {disbandPending ? <Spinner size={12} color="#fff"/> : 'Disband'}
                </button>
                <button onClick={onCancelDisband} className={clsx('btn', 'btn-soft', styles.softBtn)}>Cancel</button>
              </div>
            ) : (
              <button onClick={onRequestDisband} className={styles.disbandLink}>
                Disband group
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
