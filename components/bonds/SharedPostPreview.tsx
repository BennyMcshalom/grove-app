'use client';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { useSpaceStore } from '@/store/useSpaceStore';
import { usePost } from '@/hooks/usePosts';

// A "Save to a Bond" share, rendered in place of the bubble's plain-text
// body — fetches the actual post (independent of any feed window, same as
// the Search/notification/Grove-profile deep links) and opens it on tap.
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
    <button onClick={open} disabled={!post}
      style={{
        display: 'block', width: '100%', maxWidth: 240, textAlign: 'left', borderRadius: 18, overflow: 'hidden',
        border: `1px solid ${sent ? 'rgba(255,255,255,.25)' : 'var(--border)'}`,
        background: sent ? 'var(--ember-deep)' : 'var(--surf-high)', cursor: post ? 'pointer' : 'default'
      }}>
      <div style={{
        padding: '.7rem .8rem .3rem', display: 'flex', alignItems: 'center', gap: '.35rem',
        fontSize: '.66rem', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '.04em',
        color: sent ? 'rgba(255,255,255,.8)' : 'var(--ink-3)'
      }}>
        <Icon name="sprout" size={11} stroke={sent ? 'rgba(255,255,255,.8)' : 'var(--ink-3)'} /> Shared a post
      </div>
      <div style={{ padding: '.2rem .8rem .8rem' }}>
        {isLoading ? (
          <div style={{ padding: '.3rem 0' }}><Spinner size={14} color={sent ? '#fff' : 'var(--ink-3)'} /></div>
        ) : isError || !post ? (
          <p style={{ fontSize: '.8rem', fontStyle: 'italic', color: sent ? 'rgba(255,255,255,.7)' : 'var(--ink-4)' }}>
            This post isn&apos;t available anymore.
          </p>
        ) : (
          <>
            {post.doing && (
              <p style={{
                fontSize: '.85rem', fontWeight: 600, lineHeight: 1.35,
                color: sent ? '#fff' : 'var(--ink)', marginBottom: post.honestThing ? '.25rem' : 0
              }}>
                {post.doing}
              </p>
            )}
            {post.honestThing && (
              <p style={{
                fontSize: '.78rem', fontStyle: 'italic', lineHeight: 1.4,
                color: sent ? 'rgba(255,255,255,.8)' : 'var(--ink-2)'
              }}>
                &ldquo;{post.honestThing}&rdquo;
              </p>
            )}
          </>
        )}
      </div>
    </button>
  );
}
