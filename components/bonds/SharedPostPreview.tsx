'use client';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { useSpaceStore } from '@/store/useSpaceStore';
import { usePost } from '@/hooks/usePosts';
import styles from './SharedPostPreview.module.css';

export function SharedPostPreview({ postId, sent }: { postId: string; sent: boolean }) {
  const router = useRouter();
  const { slugById } = useSpaceStore();
  const { data: post, isLoading, isError } = usePost(postId);

  const open = () => {
    if (!post) return;
    const slug = slugById(post.spaceId);
    if (slug) router.push(`/spaces/${slug}?post=${post.id}`);
  };

  return (
    <button onClick={open} disabled={!post} className={clsx(styles.wrap, sent && styles.sent, post && styles.clickable)}>
      <div className={clsx(styles.eyebrow, sent && styles.sent)}>
        <Icon name="sprout" size={11} stroke={sent ? 'rgba(255,255,255,.8)' : 'var(--ink-3)'} /> Shared a post
      </div>
      <div className={styles.body}>
        {isLoading ? (
          <div className={styles.loadingWrap}>
            <Spinner size={14} color={sent ? '#fff' : 'var(--ink-3)'} />
          </div>
        ) : isError || !post ? (
          <p className={clsx(styles.unavailable, sent && styles.sent)}>
            This post isn&apos;t available anymore.
          </p>
        ) : (
          <>
            {post.doing && (
              <p className={clsx(styles.doing, sent && styles.sent, post.honestThing && styles.hasHonest)}>
                {post.doing}
              </p>
            )}
            {post.honestThing && (
              <p className={clsx(styles.honest, sent && styles.sent)}>
                &ldquo;{post.honestThing}&rdquo;
              </p>
            )}
          </>
        )}
      </div>
    </button>
  );
}
