'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Icon } from '@/components/ui/Icon';
import { useToastStore } from '@/store/useToastStore';
import { useSpaceStore } from '@/store/useSpaceStore';
import { useUpdatePost, useDeletePost } from '@/hooks/usePosts';
import { formatRelativeTime } from '@/lib/mappers';
import type { PostRecord } from '@/lib/api';

// ── A single post card on the Grove profile, with edit/delete for the owner ──
export function GrovePostCard({ post: p, canManage }: { post: PostRecord; canManage: boolean }) {
  const router = useRouter();
  const { toast } = useToastStore();
  const qc = useQueryClient();
  const { slugById } = useSpaceStore();
  const isGrouv = p.kind === 'just_grouw';
  const [menu, setMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDel, setConfirm] = useState(false);
  const [editDoing, setEditDoing] = useState(p.doing ?? '');
  const [editHonest, setEditHonest] = useState(p.honestThing ?? '');
  const [editBody, setEditBody] = useState(p.body ?? '');
  const updatePost = useUpdatePost();
  const deletePost = useDeletePost();

  const openPost = () => {
    const slug = slugById(p.spaceId);
    if (slug) router.push(`/spaces/${slug}?post=${p.id}`);
  };

  const saveEdit = async () => {
    try {
      if (isGrouv) {
        if (!editBody.trim()) return;
        await updatePost.mutateAsync({ id: p.id, data: { body: editBody.trim() } });
      } else {
        if (!editDoing.trim() || !editHonest.trim()) return;
        await updatePost.mutateAsync({ id: p.id, data: { doing: editDoing.trim(), honestThing: editHonest.trim() } });
      }
      qc.invalidateQueries({ queryKey: ['grove-posts'] });
      setEditing(false);
      toast('Post updated.');
    } catch { toast('Could not save changes.'); }
  };

  const handleDelete = async () => {
    try {
      await deletePost.mutateAsync(p.id);
      qc.invalidateQueries({ queryKey: ['grove-posts'] });
      toast('Post deleted.');
    } catch { toast('Could not delete post.'); }
  };

  return (
    <article className="card" style={{ overflow: 'hidden', padding: 0, position: 'relative' }}>
      {p.mediaUrl && !editing && (
        <div onClick={openPost} style={{ position: 'relative', height: 150, background: 'var(--surf-high)', cursor: 'pointer' }}>
          {p.mediaType?.startsWith('video') ? (
            <video src={p.mediaUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} muted />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.mediaUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          )}
          {p.mediaType?.startsWith('video') && (
            <span style={{
              position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: '50%',
              background: 'rgba(20,14,8,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Icon name="video" size={13} stroke="#fff" />
            </span>
          )}
        </div>
      )}
      <div style={{ padding: '.9rem 1.1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.5rem' }}>
          <span className="mono" style={{ fontSize: '.66rem', color: 'var(--ink-4)' }}>{formatRelativeTime(p.createdAt)}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
            {isGrouv && <span className="chip" style={{ background: 'var(--ember-dim)', color: 'var(--ember-deep)', fontSize: '.62rem' }}>Just Grouv</span>}
            {canManage && (
              <button onClick={() => { setMenu(m => !m); setConfirm(false); }}
                style={{ width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name="dots" size={14} stroke="var(--ink-4)" />
              </button>
            )}
          </div>
        </div>

        {menu && (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 19 }} onClick={() => setMenu(false)} />
            <div className="fade-in" style={{
              position: 'absolute', top: 40, right: 12, zIndex: 20,
              background: 'var(--white)', borderRadius: 'var(--r-md)', boxShadow: 'var(--shadow-lg)',
              border: '1px solid var(--border)', overflow: 'hidden', width: 160
            }}>
              <button onClick={() => { setMenu(false); setEditing(true); setEditDoing(p.doing ?? ''); setEditHonest(p.honestThing ?? ''); setEditBody(p.body ?? ''); }}
                style={{ display: 'flex', width: '100%', textAlign: 'left', padding: '.65rem 1rem', fontSize: '.86rem', color: 'var(--ink-2)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surf-low)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                Edit post
              </button>
              <button onClick={() => { setMenu(false); setConfirm(true); }}
                style={{ display: 'flex', width: '100%', textAlign: 'left', padding: '.65rem 1rem', fontSize: '.86rem', color: 'var(--red)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surf-low)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                Delete post
              </button>
            </div>
          </>
        )}

        {confirmDel && (
          <div className="fade-in" style={{
            background: 'var(--red-dim)', borderRadius: 'var(--r-sm)',
            padding: '.6rem .8rem', marginBottom: '.6rem', display: 'flex', alignItems: 'center', gap: '.6rem',
            border: '1px solid var(--red-bdr)'
          }}>
            <span style={{ flex: 1, fontSize: '.8rem', color: 'var(--red)', fontWeight: 500 }}>Delete this post?</span>
            <button onClick={handleDelete} disabled={deletePost.isPending}
              className="btn btn-primary" style={{ padding: '.3rem .7rem', fontSize: '.76rem', background: 'var(--red)', boxShadow: 'none' }}>
              {deletePost.isPending ? 'Deleting…' : 'Delete'}
            </button>
            <button onClick={() => setConfirm(false)} className="btn btn-soft" style={{ padding: '.3rem .7rem', fontSize: '.76rem' }}>Cancel</button>
          </div>
        )}

        {editing ? (
          isGrouv ? (
            <div>
              <textarea value={editBody} onChange={e => setEditBody(e.target.value)} maxLength={200} autoFocus
                style={{
                  width: '100%', resize: 'vertical', minHeight: 56, padding: '.55rem .7rem', fontSize: '.95rem',
                  lineHeight: 1.5, borderRadius: 'var(--r-sm)', border: '1.5px solid var(--ember)',
                  background: 'var(--surf-low)', marginBottom: '.5rem'
                }} />
              <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'flex-end' }}>
                <button onClick={() => setEditing(false)} className="btn btn-soft" style={{ padding: '.35rem .75rem', fontSize: '.78rem' }}>Cancel</button>
                <button onClick={saveEdit} disabled={updatePost.isPending || !editBody.trim()} className="btn btn-primary" style={{ padding: '.35rem .75rem', fontSize: '.78rem' }}>
                  {updatePost.isPending ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <textarea value={editDoing} onChange={e => setEditDoing(e.target.value)} maxLength={200}
                style={{
                  width: '100%', resize: 'vertical', minHeight: 46, padding: '.5rem .65rem', fontSize: '.9rem',
                  fontWeight: 600, lineHeight: 1.4, borderRadius: 'var(--r-sm)', border: '1.5px solid var(--ember)',
                  background: 'var(--surf-low)', marginBottom: '.4rem'
                }} />
              <textarea value={editHonest} onChange={e => setEditHonest(e.target.value)} maxLength={300}
                style={{
                  width: '100%', resize: 'vertical', minHeight: 46, padding: '.5rem .65rem', fontSize: '.85rem',
                  fontStyle: 'italic', lineHeight: 1.45, borderRadius: 'var(--r-sm)', border: '1.5px solid var(--border-2)',
                  background: 'var(--surf-low)', marginBottom: '.5rem'
                }} />
              <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'flex-end' }}>
                <button onClick={() => setEditing(false)} className="btn btn-soft" style={{ padding: '.35rem .75rem', fontSize: '.78rem' }}>Cancel</button>
                <button onClick={saveEdit} disabled={updatePost.isPending || !editDoing.trim() || !editHonest.trim()} className="btn btn-primary" style={{ padding: '.35rem .75rem', fontSize: '.78rem' }}>
                  {updatePost.isPending ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          )
        ) : (
          <div onClick={openPost} style={{ cursor: 'pointer' }}>
            {isGrouv ? (
              p.body && <p className="serif" style={{ fontSize: '1.05rem', fontWeight: 500, lineHeight: 1.4, color: 'var(--ink)' }}>{p.body}</p>
            ) : (
              <>
                {p.doing && <p style={{ fontSize: '.95rem', fontWeight: 600, lineHeight: 1.35, marginBottom: p.honestThing ? '.35rem' : 0 }}>{p.doing}</p>}
                {p.honestThing && (
                  <p style={{ fontSize: '.87rem', color: 'var(--ink-3)', fontStyle: 'italic', lineHeight: 1.45 }}>&ldquo;{p.honestThing}&rdquo;</p>
                )}
              </>
            )}

            {((p.rootCount ?? 0) > 0 || (p.commentCount ?? 0) > 0) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '.7rem', paddingTop: '.6rem', borderTop: '1px solid var(--border)' }}>
                {(p.rootCount ?? 0) > 0 && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '.3rem', fontSize: '.78rem', color: 'var(--ink-3)' }}>
                    <Icon name="sprout" size={14} stroke="var(--sage)" /> {p.rootCount}
                  </span>
                )}
                {(p.commentCount ?? 0) > 0 && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '.3rem', fontSize: '.78rem', color: 'var(--ink-3)' }}>
                    <Icon name="comment" size={13} stroke="var(--ink-3)" /> {p.commentCount}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
