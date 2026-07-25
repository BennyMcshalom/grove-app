'use client';
import { useRouter } from 'next/navigation';
import { useSpaceStore } from '@/store/useSpaceStore';
import { formatRelativeTime } from '@/lib/mappers';
import type { PostRecord } from '@/lib/api';

export function PostResults({ posts, showLabel }: { posts: PostRecord[]; showLabel: boolean }) {
  const router = useRouter();
  const { slugById } = useSpaceStore();

  return (
    <section>
      {showLabel && <div className="label-mono" style={{ marginBottom: '.8rem' }}>Posts</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
        {posts.map(p => {
          const slug = slugById(p.spaceId);
          return (
            <button key={p.id}
              onClick={() => router.push(slug ? `/spaces/${slug}?post=${p.id}` : '/spaces')}
              className="card" style={{ display: 'block', width: '100%', textAlign: 'left', padding: '1rem 1.1rem', boxShadow: 'var(--shadow-soft)', cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '.85')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
              <p style={{ fontWeight: 500, marginBottom: '.3rem', fontSize: '.92rem' }}>{p.doing}</p>
              {p.honestThing && <p style={{ fontSize: '.86rem', fontStyle: 'italic', color: 'var(--ink-2)', lineHeight: 1.5 }}>{p.honestThing}</p>}
              <div style={{ fontSize: '.72rem', color: 'var(--ink-4)', marginTop: '.5rem', fontFamily: 'DM Mono, monospace' }}>
                {formatRelativeTime(p.createdAt ?? '')}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
