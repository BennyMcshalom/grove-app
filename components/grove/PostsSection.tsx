'use client';
import { Spinner } from '@/components/ui/Spinner';
import { GrovePostCard } from '@/components/grove/GrovePostCard';
import type { PostRecord } from '@/lib/api';

export function PostsSection({ possessiveCap, posts, isLoading, isOwnProfile, firstName }: {
  possessiveCap: string;
  posts: PostRecord[] | undefined;
  isLoading: boolean;
  isOwnProfile: boolean;
  firstName: string;
}) {
  // Everything posted (excluding anonymous ones, which stay anonymous here too).
  // Centered full-width below the two-column layout, not squeezed into the right rail.
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 clamp(1rem, 4vw, 1.6rem) 3rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.6rem', marginBottom: '1rem' }}>
        <div className="label-mono">{possessiveCap} Posts</div>
        {!!posts?.length && <span style={{ fontSize: '.7rem', color: 'var(--ink-4)' }}>· {posts.length} shared</span>}
      </div>

      {isLoading ? (
        <div className="card" style={{ padding: '1.4rem', display: 'flex', justifyContent: 'center' }}>
          <Spinner size={18} />
        </div>
      ) : posts && posts.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
          {posts.slice(0, 6).map(p => (
            <GrovePostCard key={p.id} post={p} canManage={isOwnProfile} />
          ))}
        </div>
      ) : (
        <div className="card" style={{ padding: '1.6rem 1.4rem', textAlign: 'center', maxWidth: 420, margin: '0 auto', background: 'linear-gradient(160deg, var(--white), var(--surf-low))' }}>
          <div style={{ fontSize: '1.3rem', marginBottom: '.3rem' }}>🌱</div>
          <p style={{ fontSize: '.85rem', color: 'var(--ink-3)', fontStyle: 'italic' }}>
            {isOwnProfile ? "You haven't posted anything yet." : `${firstName} hasn't posted anything yet.`}
          </p>
        </div>
      )}
    </div>
  );
}
