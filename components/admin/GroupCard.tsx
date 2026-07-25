'use client';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import type { AdminGroup, AdminGroupPost } from '@/lib/api';

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
    <div className="card" style={{ padding: '1rem 1.2rem' }}>
      <button onClick={onToggle}
        style={{ display: 'flex', alignItems: 'center', gap: '.8rem', width: '100%', textAlign: 'left' }}>
        <span style={{ width: 34, height: 34, borderRadius: '50%', background: g.coverColor,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '1.1rem' }}>
          {g.emoji}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '.92rem' }}>{g.name}</div>
          <div style={{ fontSize: '.76rem', color: 'var(--ink-3)' }}>
            {g.memberCount} members · {g.postCount} posts · {g.lifePhase}
            {g.isSeeded && ' · default'}
          </div>
        </div>
        <span style={{ display: 'flex', transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform .15s' }}>
          <Icon name="arrow" size={16} stroke="var(--ink-4)"/>
        </span>
      </button>

      {isOpen && (
        <div className="fade-in" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', gap: '.5rem', marginBottom: '1rem' }}>
            <input value={removeMemberId} onChange={e => setRemoveMemberId(e.target.value)}
              placeholder="User id to remove from group…"
              style={{ flex: 1, padding: '.5rem .7rem', fontSize: '.82rem', borderRadius: 'var(--r-md)',
                border: '1.5px solid var(--border-2)', background: 'var(--surf-low)' }}/>
            <button onClick={onRemoveMember} disabled={removeMemberPending || !removeMemberId.trim()}
              className="btn btn-soft" style={{ fontSize: '.8rem', padding: '.5rem .9rem' }}>
              {removeMemberPending ? <Spinner size={12}/> : 'Remove member'}
            </button>
          </div>

          <div className="label-mono" style={{ marginBottom: '.6rem' }}>Recent posts</div>
          {postsLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem' }}><Spinner size={16}/></div>
          ) : !posts?.length ? (
            <p style={{ fontSize: '.82rem', color: 'var(--ink-4)', fontStyle: 'italic' }}>No posts in this group yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem', marginBottom: '1rem' }}>
              {posts.map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '.6rem',
                  background: 'var(--surf-low)', borderRadius: 'var(--r-md)', padding: '.6rem .8rem' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '.76rem', fontWeight: 600, marginBottom: '.2rem' }}>{p.authorName}</div>
                    <div style={{ fontSize: '.84rem', color: 'var(--ink-2)' }}>{p.content}</div>
                  </div>
                  <button onClick={() => onRemovePost(p.id)} disabled={removePostPending}
                    title="Remove post" style={{ flexShrink: 0, color: 'var(--red)' }}>
                    <Icon name="close" size={15} stroke="var(--red)"/>
                  </button>
                </div>
              ))}
            </div>
          )}

          {!g.isSeeded && (
            confirming ? (
              <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
                <span style={{ fontSize: '.8rem', color: 'var(--red)', fontWeight: 500 }}>Disband this group?</span>
                <button onClick={onConfirmDisband} disabled={disbandPending}
                  className="btn btn-primary" style={{ background: 'var(--red)', boxShadow: 'none', fontSize: '.78rem', padding: '.35rem .8rem' }}>
                  {disbandPending ? <Spinner size={12} color="#fff"/> : 'Disband'}
                </button>
                <button onClick={onCancelDisband} className="btn btn-soft" style={{ fontSize: '.78rem', padding: '.35rem .8rem' }}>Cancel</button>
              </div>
            ) : (
              <button onClick={onRequestDisband}
                style={{ fontSize: '.78rem', color: 'var(--red)', fontWeight: 600 }}>
                Disband group
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
