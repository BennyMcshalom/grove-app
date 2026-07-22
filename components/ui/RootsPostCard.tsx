'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar } from './Avatar';
import { Icon } from './Icon';
import { StageChip } from './StageChip';
import { VideoPlayer } from './VideoPlayer';
import { ReportModal } from './ReportModal';
import { ShareModal } from './ShareModal';
import { useToastStore } from '@/store/useToastStore';
import { usePostComments, useAddComment, useUpdatePost, useDeletePost } from '@/hooks/usePosts';
import { postsApi } from '@/lib/api';
import type { Post } from '@/lib/types';

// The full "Roots" post card — header/menu, root + comment + share footer,
// inline comment thread. Shared by Home and a Space's own Roots/Open feeds
// so a post looks and behaves identically wherever it's read from.
export function PostCard({ post, myId, showViewGrouv }: { post: Post; myId?: string; showViewGrouv?: boolean }) {
  const router = useRouter();
  const { toast } = useToastStore();
  const postUuid = String(post.id); // id is actually the UUID string at runtime

  // ── Reactions (persisted) ──
  const [rooted, setRooted] = useState(!!post.rooted);
  const [roots, setRoots] = useState(post.roots || 0);

  const toggleRoot = async () => {
    const next = !rooted;
    setRooted(next);                               // optimistic
    setRoots(n => next ? n + 1 : n - 1);
    try {
      if (next) await postsApi.react(postUuid, '🌱');
      else await postsApi.unreact(postUuid, '🌱');
    } catch {
      setRooted(!next);                            // revert on failure
      setRoots(n => next ? n - 1 : n + 1);
    }
  };

  // ── Comments (persisted) ──
  const [showC, setShowC] = useState(false);
  const [draft, setDraft] = useState('');
  const [commentCount, setCommentCount] = useState(post.comments ?? 0);
  const { data: fetchedComments } = usePostComments(showC ? postUuid : undefined);
  const addCommentMutation = useAddComment(postUuid);
  const comments = fetchedComments ?? [];

  const submitComment = async () => {
    if (!draft.trim() || addCommentMutation.isPending) return;
    const text = draft.trim();
    setDraft('');
    try {
      await addCommentMutation.mutateAsync(text);
      setCommentCount(n => n + 1); // bump the footer count immediately
    } catch (err) {
      setDraft(text);
      const msg = err instanceof Error ? err.message : '';
      toast(msg ? `Comment failed: ${msg}` : 'Comment failed. Try again.');
    }
  };

  // ── Share ──
  const [sharing, setSharing] = useState(false);

  // ── Menu / Edit / Delete ──
  const [menu, setMenu] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const [editing, setEditing] = useState(false);
  const [confirmDel, setConfirm] = useState(false);
  const [editDoing, setEditDoing] = useState(post.doing);
  const [editHonest, setEditHonest] = useState(post.honest);
  const [reportingPost, setReportingPost] = useState(false);
  const [reportingComment, setReportingComment] = useState<string | null>(null);
  const updatePost = useUpdatePost();
  const deletePost = useDeletePost();
  const isOwn = !!myId && post.userId === myId;
  const postId = (post as Post & { _id?: string })._id ?? String(post.id);

  const name = post.anon ? 'A connection in your space' : post.name || '';

  const saveEdit = async () => {
    try {
      await updatePost.mutateAsync({ id: postId, data: { doing: editDoing, honestThing: editHonest } });
      setEditing(false);
      toast('Post updated.');
    } catch { toast('Could not save changes.'); }
  };

  const handleDelete = async () => {
    try {
      await deletePost.mutateAsync(postId);
      toast('Post deleted.');
    } catch { toast('Could not delete post.'); }
  };

  const menuRow = (label: string, action: () => void, danger = false) => (
    <button key={label} onClick={action}
      style={{
        display: 'flex', alignItems: 'center', width: '100%', textAlign: 'left',
        padding: '.65rem 1rem', fontSize: '.86rem', color: danger ? 'var(--red)' : 'var(--ink-2)',
        gap: '.55rem'
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surf-low)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
      {label}
    </button>
  );

  return (
    <article className="card" style={{ padding: '1.3rem 1.4rem', marginBottom: '.9rem', position: 'relative' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: '.8rem', marginBottom: '.9rem' }}>
        <button onClick={() => { if (!post.anon && post.userId) router.push(`/grove/${post.userId}`); }}>
          <Avatar name={post.anon ? '' : name} anon={post.anon} size={46} aura={post.anon ? undefined : (post.aura ?? undefined)} avatarUrl={post.anon ? undefined : post.avatarUrl} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, fontSize: '.95rem' }}>{name}</span>
            <StageChip space={post.space} stage={post.progress} small />
          </div>
          <div style={{ fontSize: '.72rem', color: 'var(--ink-4)', marginTop: 1, fontFamily: 'DM Mono, monospace' }}>{post.time}</div>
        </div>
        {showViewGrouv && !post.anon && post.userId && (
          <button onClick={() => router.push(`/grove/${post.userId}`)}
            className="btn btn-ghost" style={{ padding: '.35rem .8rem', fontSize: '.76rem', flexShrink: 0 }}>
            View Grouv
          </button>
        )}
        <button
          onClick={e => {
            if (menu) { setMenu(false); return; }
            const btn = e.currentTarget.getBoundingClientRect();
            const MENU_H = isOwn ? 160 : 90;
            const MENU_W = 180;
            const PAD = 8;
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            // Anchor below button, flip up if not enough space below
            const top = btn.bottom + MENU_H > vh - PAD ? btn.top - MENU_H : btn.bottom + 4;
            // Align right edge of menu to right edge of button, clamp to screen
            const right = Math.max(PAD, vw - btn.right);
            setMenuPos({ top: Math.max(PAD, top), right });
            setMenu(true);
            setConfirm(false);
          }}
          style={{ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="dots" stroke="var(--ink-4)" />
        </button>
      </header>

      {menu && menuPos && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 19 }} onClick={() => setMenu(false)} />
          <div className="fade-in" style={{
            position: 'fixed',
            top: menuPos.top,
            right: menuPos.right,
            zIndex: 20,
            background: 'var(--white)', borderRadius: 'var(--r-md)', boxShadow: 'var(--shadow-lg)',
            border: '1px solid var(--border)', overflow: 'hidden',
            width: 'min(180px, calc(100vw - 20px))'
          }}>
            {isOwn && <>
              {menuRow('Edit post', () => { setMenu(false); setEditing(true); setEditDoing(post.doing); setEditHonest(post.honest); })}
              {menuRow('Delete post', () => { setMenu(false); setConfirm(true); }, true)}
              <div style={{ borderTop: '1px solid var(--border)' }} />
            </>}
            {menuRow('Save to a Bond', () => { setMenu(false); toast('Saved.'); })}
            {menuRow('Report', () => { setMenu(false); setReportingPost(true); }, true)}
          </div>
        </>
      )}

      {reportingPost && (
        <ReportModal contentType="post" contentId={postUuid} onClose={() => setReportingPost(false)} />
      )}

      {/* Delete confirmation */}
      {confirmDel && (
        <div className="fade-in" style={{
          background: 'var(--red-dim)', borderRadius: 'var(--r-sm)',
          padding: '.75rem 1rem', marginBottom: '.8rem', display: 'flex', alignItems: 'center', gap: '.8rem',
          border: '1px solid var(--red-bdr)'
        }}>
          <span style={{ flex: 1, fontSize: '.86rem', color: 'var(--red)', fontWeight: 500 }}>Delete this post?</span>
          <button onClick={handleDelete} disabled={deletePost.isPending}
            className="btn btn-primary" style={{
              padding: '.35rem .8rem', fontSize: '.8rem',
              background: 'var(--red)', boxShadow: 'none'
            }}>
            {deletePost.isPending ? 'Deleting…' : 'Delete'}
          </button>
          <button onClick={() => setConfirm(false)} className="btn btn-soft"
            style={{ padding: '.35rem .8rem', fontSize: '.8rem' }}>Cancel</button>
        </div>
      )}

      {editing ? (
        <div style={{ marginBottom: '.8rem' }}>
          <textarea value={editDoing} onChange={e => setEditDoing(e.target.value)} maxLength={200}
            style={{
              width: '100%', resize: 'vertical', minHeight: 60, padding: '.6rem .8rem',
              fontSize: '1rem', fontWeight: 500, lineHeight: 1.5, borderRadius: 'var(--r-sm)',
              border: '1.5px solid var(--ember)', background: 'var(--surf-low)', marginBottom: '.5rem'
            }} />
          <textarea value={editHonest} onChange={e => setEditHonest(e.target.value)} maxLength={300}
            style={{
              width: '100%', resize: 'vertical', minHeight: 56, padding: '.6rem .8rem',
              fontSize: '.95rem', fontStyle: 'italic', lineHeight: 1.6, borderRadius: 'var(--r-sm)',
              border: '1.5px solid var(--border-2)', background: 'var(--surf-low)', marginBottom: '.7rem'
            }} />
          <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'flex-end' }}>
            <button onClick={() => setEditing(false)} className="btn btn-soft"
              style={{ padding: '.4rem .9rem', fontSize: '.82rem' }}>Cancel</button>
            <button onClick={saveEdit} disabled={updatePost.isPending} className="btn btn-primary"
              style={{ padding: '.4rem .9rem', fontSize: '.82rem' }}>
              {updatePost.isPending ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      ) : (
        <>
          <p style={{ fontSize: '1.02rem', fontWeight: 500, lineHeight: 1.5, marginBottom: '.5rem' }}>{post.doing}</p>
          <p style={{ fontSize: '.95rem', fontStyle: 'italic', color: 'var(--ink-2)', lineHeight: 1.6 }}>{post.honest}</p>
        </>
      )}

      {post.media && (
        <div style={{ margin: '.9rem 0 .2rem' }}>
          {post.media.type === 'video'
            ? <VideoPlayer src={post.media.src} />
            : <div style={{ borderRadius: 'var(--r-md)', overflow: 'hidden', background: 'var(--surf-high)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={post.media.src} alt="" style={{ width: '100%', display: 'block', maxHeight: 320, objectFit: 'contain' }} />
            </div>
          }
        </div>
      )}

      <footer style={{ marginTop: '.9rem', paddingTop: '.7rem', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '.4rem' }}>
        <button onClick={toggleRoot} style={{
          display: 'flex', alignItems: 'center', gap: '.4rem',
          padding: '.45rem .8rem', borderRadius: 100, fontSize: '.84rem', fontWeight: 500,
          color: rooted ? 'var(--ember)' : 'var(--ink-3)', background: rooted ? 'var(--ember-dim)' : 'transparent', transition: 'all .15s'
        }}>
          <Icon name="sprout" size={17} stroke={rooted ? 'var(--ember)' : 'var(--ink-3)'} /> Root {roots}
        </button>
        <button onClick={() => setShowC(s => !s)} style={{
          display: 'flex', alignItems: 'center', gap: '.4rem',
          padding: '.45rem .8rem', borderRadius: 100, fontSize: '.84rem', fontWeight: 500,
          color: showC ? 'var(--slate)' : 'var(--ink-3)', background: showC ? 'var(--slate-dim)' : 'transparent'
        }}>
          <Icon name="comment" size={16} stroke={showC ? 'var(--slate)' : 'var(--ink-3)'} /> Comment {commentCount}
        </button>
        <button onClick={() => setSharing(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '.4rem', padding: '.45rem .8rem', borderRadius: 100, fontSize: '.84rem', fontWeight: 500, color: 'var(--ink-3)' }}>
          <Icon name="share" size={16} stroke="var(--ink-3)" /> Share
        </button>
      </footer>

      {sharing && <ShareModal post={post} onClose={() => setSharing(false)} />}

      {showC && (
        <div className="fade-in" style={{ marginTop: '.8rem', paddingTop: '.9rem', borderTop: '1px solid var(--border)' }}>
          {comments.map(c => (
            <div key={c.id} style={{ display: 'flex', gap: '.6rem', marginBottom: '.8rem' }}>
              <Avatar name={c.authorName} size={32} avatarUrl={c.authorAvatar} aura={c.authorAura ?? undefined} />
              <div style={{
                background: 'var(--surf-low)', borderRadius: 'var(--r-md)', padding: '.55rem .8rem', flex: 1,
                display: 'flex', alignItems: 'flex-start', gap: '.5rem'
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '.8rem' }}>{c.authorName}</div>
                  <div style={{ fontSize: '.86rem', color: 'var(--ink-2)', lineHeight: 1.45 }}>{c.body}</div>
                </div>
                <button onClick={() => setReportingComment(c.id)} title="Report comment"
                  style={{ flexShrink: 0, opacity: .5, marginTop: 1 }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '.5')}>
                  <Icon name="flag" size={12} stroke="var(--ink-4)" />
                </button>
              </div>
            </div>
          ))}
          {reportingComment && (
            <ReportModal contentType="comment" contentId={reportingComment} onClose={() => setReportingComment(null)} />
          )}
          {comments.length === 0 && !addCommentMutation.isPending && (
            <p style={{ fontSize: '.82rem', color: 'var(--ink-4)', fontStyle: 'italic', marginBottom: '.8rem' }}>
              No comments yet. Be the first.
            </p>
          )}
          <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
            <input value={draft} onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') submitComment(); }}
              placeholder="Add a comment…"
              style={{ flex: 1, padding: '.6rem .9rem', borderRadius: 100, border: '1.5px solid var(--border-2)', background: 'var(--surf-low)', fontSize: '.88rem' }}
              onFocus={e => { e.target.style.borderColor = 'var(--ember)'; }}
              onBlur={e => { e.target.style.borderColor = 'var(--border-2)'; }} />
            <button onClick={submitComment}
              disabled={!draft.trim() || addCommentMutation.isPending}
              className="btn btn-primary"
              style={{ padding: '.5rem .7rem', opacity: draft.trim() ? 1 : .5 }}>
              <Icon name="send" size={16} stroke="#fff" />
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
