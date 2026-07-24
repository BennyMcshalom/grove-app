'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { ReportModal } from '@/components/ui/ReportModal';
import { ShareModal } from '@/components/ui/ShareModal';
import { useToastStore } from '@/store/useToastStore';
import { usePostComments, useAddComment, useUpdatePost, useDeletePost } from '@/hooks/usePosts';
import { postsApi } from '@/lib/api';
import type { Post } from '@/lib/types';

// ── Just Grouv card ──────────────────────────────────────────────
export function JustGrouvCard({ post, myId }: { post: Post; myId?: string }) {
  const router = useRouter();
  const { toast } = useToastStore();
  const postUuid = String(post.id);
  const postId = (post as Post & { _id?: string })._id ?? String(post.id);
  const [playing, setPlaying] = useState(false);
  const [rooted, setRooted] = useState(!!post.rooted);
  const [roots, setRoots] = useState(post.roots ?? 0);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [showC, setShowC] = useState(false);
  const [draft, setDraft] = useState('');
  const [commentCount, setCommentCount] = useState(post.comments ?? 0);
  const { data: fetchedComments } = usePostComments(showC ? postUuid : undefined);
  const addCommentMutation = useAddComment(postUuid);
  const comments = fetchedComments ?? [];
  const [reportingPost, setReportingPost] = useState(false);
  const [reportingComment, setReportingComment] = useState<string | null>(null);

  // ── Menu / Edit / Delete (own posts only) ──
  const isOwn = !!myId && post.userId === myId;
  const [menu, setMenu] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const [editing, setEditing] = useState(false);
  const [confirmDel, setConfirm] = useState(false);
  const [editCaption, setEditCaption] = useState(post.caption ?? '');
  const updatePost = useUpdatePost();
  const deletePost = useDeletePost();

  const saveEdit = async () => {
    if (!editCaption.trim()) return;
    try {
      await updatePost.mutateAsync({ id: postId, data: { body: editCaption.trim() } });
      setEditing(false);
      toast('Grouv updated.');
    } catch { toast('Could not save changes.'); }
  };

  const handleDelete = async () => {
    try {
      await deletePost.mutateAsync(postId);
      toast('Grouv deleted.');
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

  const submitComment = async () => {
    if (!draft.trim() || addCommentMutation.isPending) return;
    const text = draft.trim();
    setDraft('');
    try {
      await addCommentMutation.mutateAsync(text);
      setCommentCount(n => n + 1);
    } catch {
      setDraft(text);
      toast('Comment failed. Try again.');
    }
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().then(() => setPlaying(true)).catch(() => { });
    } else {
      v.pause();
      setPlaying(false);
    }
  };
  const name = post.anon ? 'A connection in your space' : post.name || '';

  const toggleRoot = async () => {
    const next = !rooted;
    setRooted(next);
    setRoots(n => next ? n + 1 : n - 1);
    try {
      if (next) await postsApi.react(postUuid, '🌱');
      else await postsApi.unreact(postUuid, '🌱');
    } catch {
      setRooted(!next);
      setRoots(n => next ? n - 1 : n + 1);
    }
  };

  const [sharing, setSharing] = useState(false);

  const nowClock = () => {
    const d = new Date();
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  };

  return (
    <article className="card" style={{ padding: '1.1rem 1.1rem 1.3rem', marginBottom: '.9rem' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: '.7rem', marginBottom: '.8rem' }}>
        <button onClick={() => { if (!post.anon && post.userId) router.push(`/grove/${post.userId}`); }}>
          <Avatar name={post.anon ? '' : name} anon={post.anon} size={40} avatarUrl={post.avatarUrl} aura={post.anon ? undefined : (post.aura ?? undefined)} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '.92rem' }}>{name}</div>
          <div style={{ fontSize: '.72rem', color: 'var(--ink-4)', fontFamily: 'var(--mono)' }}>{post.time}</div>
        </div>
        <span className="chip" style={{ background: 'var(--ember-dim)', color: 'var(--ember-deep)', fontSize: '.62rem' }}>
          Just Grouv
        </span>
        {isOwn ? (
          <button
            onClick={e => {
              if (menu) { setMenu(false); return; }
              const btn = e.currentTarget.getBoundingClientRect();
              const MENU_H = 160, MENU_W = 180, PAD = 8;
              const vw = window.innerWidth, vh = window.innerHeight;
              const top = btn.bottom + MENU_H > vh - PAD ? btn.top - MENU_H : btn.bottom + 4;
              const right = Math.max(PAD, vw - btn.right);
              setMenuPos({ top: Math.max(PAD, top), right });
              setMenu(true);
              setConfirm(false);
            }}
            style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name="dots" size={15} stroke="var(--ink-4)" />
          </button>
        ) : (
          <button onClick={() => setReportingPost(true)} title="Report"
            style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name="flag" size={15} stroke="var(--ink-4)" />
          </button>
        )}
      </header>

      {menu && menuPos && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 19 }} onClick={() => setMenu(false)} />
          <div className="fade-in" style={{
            position: 'fixed', top: menuPos.top, right: menuPos.right, zIndex: 20,
            background: 'var(--white)', borderRadius: 'var(--r-md)', boxShadow: 'var(--shadow-lg)',
            border: '1px solid var(--border)', overflow: 'hidden',
            width: 'min(180px, calc(100vw - 20px))'
          }}>
            {menuRow('Edit caption', () => { setMenu(false); setEditing(true); setEditCaption(post.caption ?? ''); })}
            {menuRow('Delete post', () => { setMenu(false); setConfirm(true); }, true)}
            <div style={{ borderTop: '1px solid var(--border)' }} />
            {menuRow('Report', () => { setMenu(false); setReportingPost(true); }, true)}
          </div>
        </>
      )}

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

      {editing && (
        <div style={{ marginBottom: '.8rem' }}>
          <textarea value={editCaption} onChange={e => setEditCaption(e.target.value)} maxLength={200} autoFocus
            style={{
              width: '100%', resize: 'vertical', minHeight: 60, padding: '.6rem .8rem',
              fontSize: '1rem', lineHeight: 1.5, borderRadius: 'var(--r-sm)',
              border: '1.5px solid var(--ember)', background: 'var(--surf-low)', marginBottom: '.5rem'
            }} />
          <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'flex-end' }}>
            <button onClick={() => setEditing(false)} className="btn btn-soft"
              style={{ padding: '.4rem .9rem', fontSize: '.82rem' }}>Cancel</button>
            <button onClick={saveEdit} disabled={updatePost.isPending || !editCaption.trim()} className="btn btn-primary"
              style={{ padding: '.4rem .9rem', fontSize: '.82rem' }}>
              {updatePost.isPending ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      )}

      {reportingPost && (
        <ReportModal contentType="post" contentId={postUuid} onClose={() => setReportingPost(false)} />
      )}

      {/* Portrait frame */}
      {post.media && (
        <div onClick={() => post.media?.type === 'video' && togglePlay()}
          style={{
            position: 'relative', borderRadius: 18, overflow: 'hidden',
            aspectRatio: '4 / 5', background: '#2a1d12',
            cursor: post.media.type === 'video' ? 'pointer' : 'default'
          }}>

          {post.media.type === 'video' ? (
            <video
              ref={videoRef}
              src={post.media.src}
              playsInline
              preload="metadata"
              loop
              onLoadedMetadata={() => { if (videoRef.current) videoRef.current.currentTime = 0.01; }}
              onEnded={() => setPlaying(false)}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <img src={post.media.src} alt=""
              style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          )}

          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(180deg, rgba(20,12,4,.55) 0%, rgba(20,12,4,.05) 28%, rgba(20,12,4,.12) 55%, rgba(20,12,4,.82) 100%)',
            pointerEvents: 'none'
          }} />

          {/* Clock + location */}
          <div style={{
            position: 'absolute', top: 14, left: 0, right: 0,
            textAlign: 'center', pointerEvents: 'none'
          }}>
            <div className="mono" style={{ color: 'rgba(255,255,255,.92)', fontSize: '.82rem', letterSpacing: '.12em' }}>
              {post.clock ?? nowClock()}
            </div>
            {post.location && (
              <div style={{
                color: 'rgba(255,255,255,.7)', fontSize: '.66rem', marginTop: 3,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3
              }}>
                <Icon name="pin" size={11} stroke="rgba(255,255,255,.7)" /> {post.location}
              </div>
            )}
          </div>

          {/* Play/pause button — videos only */}
          {post.media.type === 'video' && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex',
              alignItems: 'center', justifyContent: 'center', pointerEvents: 'none'
            }}>
              <div style={{
                width: 58, height: 58, borderRadius: '50%', background: 'rgba(255,255,255,.9)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: playing ? 0 : 1, transition: 'opacity .25s'
              }}>
                <Icon name="play" size={24} stroke="var(--ink)" />
              </div>
            </div>
          )}

          {/* Caption */}
          {post.caption && !editing && (
            <div style={{
              position: 'absolute', left: 0, right: 0, bottom: 0,
              padding: '1.4rem 1.3rem 1.5rem', textAlign: 'center', pointerEvents: 'none'
            }}>
              <p className="serif" style={{
                color: '#fff', fontSize: '16px', fontStyle: 'italic',
                fontWeight: 500, lineHeight: 1.2, textShadow: '0 2px 12px rgba(0,0,0,.4)'
              }}>
                {post.caption}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <footer style={{ marginTop: '.8rem', display: 'flex', alignItems: 'center', gap: '.4rem' }}>
        <button onClick={toggleRoot}
          style={{
            display: 'flex', alignItems: 'center', gap: '.4rem', padding: '.45rem .8rem',
            borderRadius: 100, fontSize: '.84rem', fontWeight: 500,
            color: rooted ? 'var(--ember)' : 'var(--ink-3)',
            background: rooted ? 'var(--ember-dim)' : 'transparent'
          }}>
          <Icon name="sprout" size={17} stroke={rooted ? 'var(--ember)' : 'var(--ink-3)'} />
          Root <span style={{ fontVariantNumeric: 'tabular-nums' }}>{roots}</span>
        </button>
        <button onClick={() => setShowC(s => !s)}
          style={{
            display: 'flex', alignItems: 'center', gap: '.4rem', padding: '.45rem .8rem',
            borderRadius: 100, fontSize: '.84rem', fontWeight: 500,
            color: showC ? 'var(--slate)' : 'var(--ink-3)',
            background: showC ? 'var(--slate-dim)' : 'transparent'
          }}>
          <Icon name="comment" size={16} stroke={showC ? 'var(--slate)' : 'var(--ink-3)'} />
          Comment <span style={{ fontVariantNumeric: 'tabular-nums' }}>{commentCount}</span>
        </button>
        <button onClick={() => setSharing(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: '.4rem', padding: '.45rem .8rem',
            borderRadius: 100, fontSize: '.84rem', fontWeight: 500, color: 'var(--ink-3)'
          }}>
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
