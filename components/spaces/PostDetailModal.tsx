'use client';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { PostCard } from '@/components/ui/RootsPostCard';
import { usePost } from '@/hooks/usePosts';
import { mapPostRecordToPost } from '@/lib/mappers';

export function PostDetailModal({ postId, myId, slug, onClose }: { postId: string; myId?: string; slug: string; onClose: () => void }) {
  const { data: post, isLoading, isError } = usePost(postId);
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(26,26,26,.55)',
      backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1.5rem'
    }}
      onClick={onClose}>
      <div className="rise" style={{
        width: 'min(480px, 94vw)', maxHeight: '85vh', overflowY: 'auto',
        background: 'var(--cream)', borderRadius: 20, boxShadow: 'var(--shadow-lg)'
      }}
        onClick={e => e.stopPropagation()}>
        <div style={{ padding: '1.2rem 1.3rem .4rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 className="serif" style={{ fontSize: '1.1rem', fontWeight: 600 }}>Post</h3>
          <button onClick={onClose}
            style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name="close" size={16} stroke="var(--ink-3)" />
          </button>
        </div>
        <div style={{ padding: '.4rem 1.3rem 1.3rem' }}>
          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem 0' }}><Spinner /></div>
          ) : isError || !post ? (
            <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--ink-3)' }}>
              This post isn&apos;t available anymore.
            </div>
          ) : (
            <PostCard post={mapPostRecordToPost(post, slug)} myId={myId} showViewGrouv />
          )}
        </div>
      </div>
    </div>
  );
}
