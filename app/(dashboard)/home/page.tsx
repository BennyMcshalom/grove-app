'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { RPSection } from '@/components/layout/RightPanel';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { StageChip } from '@/components/ui/StageChip';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Waveform } from '@/components/ui/Waveform';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ReportModal } from '@/components/ui/ReportModal';
import { useUserStore } from '@/store/useUserStore';
import { useToastStore } from '@/store/useToastStore';
import { useSpaceStore } from '@/store/useSpaceStore';
import { usePosts, useCreatePost, useReactToPost, usePostComments, useAddComment, useUpdatePost, useDeletePost } from '@/hooks/usePosts';
import { useQuery } from '@tanstack/react-query';
import { spacesApi } from '@/lib/api';
import { useSuggestions } from '@/hooks/useUsers';
import { useInviteToBond, useSentBondInvitations } from '@/hooks/useBondInvitations';
import { useBonds } from '@/hooks/useBonds';
import { useGroups } from '@/hooks/useGroups';
import { PROGRESS, spaceById, groupIcon } from '@/lib/data';
import { SpaceIcon } from '@/components/ui/SpaceIcon';
import { postsApi, type PostRecord } from '@/lib/api';
import { VideoPlayer } from '@/components/ui/VideoPlayer';
import { formatRelativeTime, formatClock } from '@/lib/mappers';
import type { Post } from '@/lib/types';

// ── Post Card ──
function PostCard({ post, myId }: { post: Post; myId?: string }) {
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
      toast(msg ? `Comment failed: ${msg}` : 'Comment failed — try again.');
    }
  };

  // ── Share ──
  const handleShare = async () => {
    const url = `${window.location.origin}/home`;
    try {
      await navigator.clipboard.writeText(url);
      toast('Link copied — share it with a Bond.');
    } catch {
      toast('Could not copy link.');
    }
  };

  // ── Menu / Edit / Delete ──
  const [menu, setMenu]           = useState(false);
  const [menuPos, setMenuPos]     = useState<{ top: number; right: number } | null>(null);
  const [editing, setEditing]     = useState(false);
  const [confirmDel, setConfirm]  = useState(false);
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
      style={{ display: 'flex', alignItems: 'center', width: '100%', textAlign: 'left',
        padding: '.65rem 1rem', fontSize: '.86rem', color: danger ? 'var(--red)' : 'var(--ink-2)',
        gap: '.55rem' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surf-low)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
      {label}
    </button>
  );

  return (
    <article className="card" style={{ padding: '1.3rem 1.4rem', marginBottom: '.9rem', position: 'relative' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: '.8rem', marginBottom: '.9rem' }}>
        <button onClick={() => { if (!post.anon && post.userId) router.push(`/grove/${post.userId}`); }}>
          <Avatar name={post.anon ? '' : name} anon={post.anon} size={46} aura={post.anon ? undefined : (post.aura ?? undefined)} avatarUrl={post.anon ? undefined : post.avatarUrl}/>
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, fontSize: '.95rem' }}>{name}</span>
            <StageChip space={post.space} stage={post.progress} small />
          </div>
          <div style={{ fontSize: '.72rem', color: 'var(--ink-4)', marginTop: 1, fontFamily: 'DM Mono, monospace' }}>{post.time}</div>
        </div>
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
            const top  = btn.bottom + MENU_H > vh - PAD ? btn.top - MENU_H : btn.bottom + 4;
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
          <div style={{ position: 'fixed', inset: 0, zIndex: 19 }} onClick={() => setMenu(false)}/>
          <div className="fade-in" style={{
            position: 'fixed',
            top: menuPos.top,
            right: menuPos.right,
            zIndex: 20,
            background: 'var(--white)', borderRadius: 'var(--r-md)', boxShadow: 'var(--shadow-lg)',
            border: '1px solid var(--border)', overflow: 'hidden',
            width: 'min(180px, calc(100vw - 20px))' }}>
            {isOwn && <>
              {menuRow('Edit post', () => { setMenu(false); setEditing(true); setEditDoing(post.doing); setEditHonest(post.honest); })}
              {menuRow('Delete post', () => { setMenu(false); setConfirm(true); }, true)}
              <div style={{ borderTop: '1px solid var(--border)' }}/>
            </>}
            {menuRow('Save to a Bond', () => { setMenu(false); toast('Saved.'); })}
            {menuRow('Report', () => { setMenu(false); setReportingPost(true); }, true)}
          </div>
        </>
      )}

      {reportingPost && (
        <ReportModal contentType="post" contentId={postUuid} onClose={() => setReportingPost(false)}/>
      )}

      {/* Delete confirmation */}
      {confirmDel && (
        <div className="fade-in" style={{ background: 'var(--red-dim)', borderRadius: 'var(--r-sm)',
          padding: '.75rem 1rem', marginBottom: '.8rem', display: 'flex', alignItems: 'center', gap: '.8rem',
          border: '1px solid var(--red-bdr)' }}>
          <span style={{ flex: 1, fontSize: '.86rem', color: 'var(--red)', fontWeight: 500 }}>Delete this post?</span>
          <button onClick={handleDelete} disabled={deletePost.isPending}
            className="btn btn-primary" style={{ padding: '.35rem .8rem', fontSize: '.8rem',
              background: 'var(--red)', boxShadow: 'none' }}>
            {deletePost.isPending ? 'Deleting…' : 'Delete'}
          </button>
          <button onClick={() => setConfirm(false)} className="btn btn-soft"
            style={{ padding: '.35rem .8rem', fontSize: '.8rem' }}>Cancel</button>
        </div>
      )}

      {editing ? (
        <div style={{ marginBottom: '.8rem' }}>
          <textarea value={editDoing} onChange={e => setEditDoing(e.target.value)} maxLength={200}
            style={{ width: '100%', resize: 'vertical', minHeight: 60, padding: '.6rem .8rem',
              fontSize: '1rem', fontWeight: 500, lineHeight: 1.5, borderRadius: 'var(--r-sm)',
              border: '1.5px solid var(--ember)', background: 'var(--surf-low)', marginBottom: '.5rem' }}/>
          <textarea value={editHonest} onChange={e => setEditHonest(e.target.value)} maxLength={300}
            style={{ width: '100%', resize: 'vertical', minHeight: 56, padding: '.6rem .8rem',
              fontSize: '.95rem', fontStyle: 'italic', lineHeight: 1.6, borderRadius: 'var(--r-sm)',
              border: '1.5px solid var(--border-2)', background: 'var(--surf-low)', marginBottom: '.7rem' }}/>
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
            ? <VideoPlayer src={post.media.src}/>
            : <div style={{ borderRadius: 'var(--r-md)', overflow: 'hidden', background: 'var(--surf-high)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={post.media.src} alt="" style={{ width: '100%', display: 'block', maxHeight: 320, objectFit: 'cover' }}/>
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
        <button onClick={handleShare}
          style={{ display: 'flex', alignItems: 'center', gap: '.4rem', padding: '.45rem .8rem', borderRadius: 100, fontSize: '.84rem', fontWeight: 500, color: 'var(--ink-3)' }}>
          <Icon name="share" size={16} stroke="var(--ink-3)" /> Share
        </button>
      </footer>

      {showC && (
        <div className="fade-in" style={{ marginTop: '.8rem', paddingTop: '.9rem', borderTop: '1px solid var(--border)' }}>
          {comments.map(c => (
            <div key={c.id} style={{ display: 'flex', gap: '.6rem', marginBottom: '.8rem' }}>
              <Avatar name={c.authorName} size={32} avatarUrl={c.authorAvatar} aura={c.authorAura ?? undefined}/>
              <div style={{ background: 'var(--surf-low)', borderRadius: 'var(--r-md)', padding: '.55rem .8rem', flex: 1,
                display: 'flex', alignItems: 'flex-start', gap: '.5rem' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '.8rem' }}>{c.authorName}</div>
                  <div style={{ fontSize: '.86rem', color: 'var(--ink-2)', lineHeight: 1.45 }}>{c.body}</div>
                </div>
                <button onClick={() => setReportingComment(c.id)} title="Report comment"
                  style={{ flexShrink: 0, opacity: .5, marginTop: 1 }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '.5')}>
                  <Icon name="flag" size={12} stroke="var(--ink-4)"/>
                </button>
              </div>
            </div>
          ))}
          {reportingComment && (
            <ReportModal contentType="comment" contentId={reportingComment} onClose={() => setReportingComment(null)}/>
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

// ── Roots Composer ──
function RootsComposer({ onPost }: { onPost?: (p: Post & { _mediaFile?: File }) => void }) {
  const { user } = useUserStore();
  const { toast } = useToastStore();
  const [mode, setMode] = useState<'root' | 'justgrouw'>('root');
  // Root mode
  const [doing, setDoing] = useState("I'm ");
  const [prog, setProg] = useState<string | null>(null);
  const [honest, setHonest] = useState('');
  // Just Grouv mode
  const [caption, setCaption] = useState('');
  const [anon, setAnon] = useState(false);
  const [media, setMedia] = useState<{ type: 'image' | 'video'; src: string; file: File } | null>(null);
  const [uploading, setUploading] = useState(false);
  const imageRef = React.useRef<HTMLInputElement>(null);
  const videoRef = React.useRef<HTMLInputElement>(null);

  const rootReady = doing.trim().length > 4 && honest.trim().length > 3 && !uploading;
  const grouwReady = !!media && caption.trim().length > 1 && !uploading;
  const ready = mode === 'root' ? rootReady : grouwReady;

  function pickFile(file: File) {
    const isVideo = file.type.startsWith('video/');
    const src = URL.createObjectURL(file);
    setMedia({ type: isVideo ? 'video' : 'image', src, file });
  }

  const nowClock = () => {
    const d = new Date();
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  };

  const uploadMedia = async () => {
    if (!media?.file) return { mediaUrl: undefined, mediaType: undefined };
    if (media.file.size > 50 * 1024 * 1024) {
      toast('Video is too large (max 50 MB). Try trimming it first.');
      throw new Error('too large');
    }
    const result = await postsApi.uploadViaProxy(media.file);
    return { mediaUrl: result.mediaUrl, mediaType: result.mediaType };
  };

  const submit = async () => {
    if (!ready) return;
    setUploading(true);

    let mediaUrl: string | undefined, mediaType: string | undefined;
    try {
      ({ mediaUrl, mediaType } = await uploadMedia());
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (!msg.includes('too large')) {
        if (msg.includes('413')) toast('Video is too large (max 50 MB).');
        else if (msg.includes('Unsupported')) toast("That file type isn't supported. Use MP4, MOV, or WebM.");
        else toast('Upload failed — check your connection and try again.');
      }
      setUploading(false);
      return;
    }

    try {
      if (mode === 'root') {
        await onPost?.({
          id: Date.now(), name: user.name, anon,
          space: user.spaces[0] || 'career', progress: prog ?? '',
          time: 'just now', doing: doing.trim(), honest: honest.trim(),
          media: mediaUrl ? { type: (mediaType?.startsWith('video') ? 'video' : 'image'), src: mediaUrl } : undefined,
          roots: 0, comments: 0, kind: 'roots',
          _mediaFile: media?.file, _mediaUrl: mediaUrl, _mediaType: mediaType,
        } as Post & { _mediaFile?: File; _mediaUrl?: string; _mediaType?: string });
        setDoing("I'm "); setProg(null); setHonest('');
      } else {
        const clock = nowClock();
        const userLocation = user.location;
        await onPost?.({
          id: Date.now(), name: user.name, anon,
          space: user.spaces[0] || 'career', progress: '',
          time: 'just now', doing: '', honest: '',
          media: mediaUrl ? { type: (mediaType?.startsWith('video') ? 'video' : 'image'), src: mediaUrl } : undefined,
          roots: 0, comments: 0, kind: 'just_grouw',
          caption: caption.trim(), clock,
          location: userLocation || undefined,
          _mediaFile: media?.file, _mediaUrl: mediaUrl, _mediaType: mediaType,
        } as Post & { _mediaFile?: File; _mediaUrl?: string; _mediaType?: string });
        setCaption('');
      }

      setAnon(false);
      if (media?.src) URL.revokeObjectURL(media.src);
      setMedia(null);
    } catch {
      // onPost already surfaced its own error toast — keep the draft so the user can retry.
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="card" style={{ padding: '1.4rem', marginBottom: '1.1rem' }}>
      <input ref={imageRef} type="file" accept="image/png,image/jpeg,image/webp,image/avif" hidden
        onChange={e => { const f = e.target.files?.[0]; if (f) pickFile(f); e.target.value = ''; }} />
      <input ref={videoRef} type="file" accept="video/mp4,video/webm,video/quicktime" hidden
        onChange={e => { const f = e.target.files?.[0]; if (f) pickFile(f); e.target.value = ''; }} />

      {/* Header: avatar + mode toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '.7rem', marginBottom: '1rem' }}>
        <Avatar name={user.name} size={40} avatarUrl={user.avatar_url}/>
        <div style={{ display: 'flex', gap: 4, background: 'var(--surf-high)', borderRadius: 100, padding: 3 }}>
          {([['root', 'Root a thought'], ['justgrouw', 'Just Grouv']] as ['root' | 'justgrouw', string][]).map(([id, l]) => (
            <button key={id} onClick={() => { setMode(id); setMedia(null); }}
              style={{ padding: '.4rem .85rem', borderRadius: 100, fontSize: '.8rem', fontWeight: 500,
                background: mode === id ? 'var(--white)' : 'transparent',
                color: mode === id ? 'var(--ember)' : 'var(--ink-3)',
                boxShadow: mode === id ? 'var(--shadow-soft)' : 'none' }}>{l}</button>
          ))}
        </div>
      </div>

      {mode === 'root' ? (
        <>
          <div style={{ marginBottom: '.9rem' }}>
            <div className="label-mono" style={{ marginBottom: '.4rem' }}>What are you doing right now?</div>
            <input value={doing} maxLength={100} onChange={e => setDoing(e.target.value)}
              style={{ width: '100%', padding: '.7rem .9rem', fontSize: '1rem', background: 'var(--surf-low)', border: '1.5px solid var(--border-2)', borderRadius: 'var(--r-md)' }}
              onFocus={e => { e.target.style.borderColor = 'var(--ember)'; e.target.style.boxShadow = '0 0 0 3px var(--ember-dim)'; }}
              onBlur={e => { e.target.style.borderColor = 'var(--border-2)'; e.target.style.boxShadow = 'none'; }} />
          </div>
          <div style={{ marginBottom: '.9rem' }}>
            <div className="label-mono" style={{ marginBottom: '.5rem' }}>
              Where are you in it? <span style={{ textTransform: 'none', letterSpacing: 0, color: 'var(--ink-4)' }}>· optional</span>
            </div>
            <div className="scroll" style={{ display: 'flex', gap: '.5rem', overflowX: 'auto', paddingBottom: 2 }}>
              {PROGRESS.map(p => (
                <button key={p} onClick={() => setProg(prog === p ? null : p)} className="chip"
                  style={{ cursor: 'pointer', flexShrink: 0, padding: '.45rem .85rem',
                    background: prog === p ? 'var(--ember)' : 'var(--surf-high)',
                    color: prog === p ? '#fff' : 'var(--ink-2)', fontWeight: 500 }}>{p}</button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: '.8rem' }}>
            <div className="label-mono" style={{ marginBottom: '.4rem' }}>One honest thing about where you are</div>
            <textarea value={honest} maxLength={200} onChange={e => setHonest(e.target.value)}
              placeholder="The honest thing is…"
              style={{ width: '100%', minHeight: 72, resize: 'vertical', padding: '.7rem .9rem', fontSize: '.97rem', lineHeight: 1.55, background: 'var(--surf-low)', border: '1.5px solid var(--border-2)', borderRadius: 'var(--r-md)' }}
              onFocus={e => { e.target.style.borderColor = 'var(--ember)'; e.target.style.boxShadow = '0 0 0 3px var(--ember-dim)'; }}
              onBlur={e => { e.target.style.borderColor = 'var(--border-2)'; e.target.style.boxShadow = 'none'; }} />
            <div style={{ textAlign: 'right', fontSize: '.68rem', color: 'var(--ink-4)', fontFamily: 'DM Mono, monospace' }}>{honest.length}/200</div>
          </div>
          {/* Media preview (root mode) */}
          {media && (
            <div style={{ position: 'relative', marginBottom: '.8rem', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
              {media.type === 'image'
                ? <img src={media.src} alt="" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', display: 'block' }} />
                : <video src={media.src} style={{ width: '100%', maxHeight: 200, display: 'block' }} controls={false} />}
              {media.type === 'video' && (
                <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.2)' }}>
                  <span style={{ width: 46, height: 46, borderRadius: '50%', background: 'rgba(255,255,255,.9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="play" size={20} stroke="var(--ink)" />
                  </span>
                </span>
              )}
              <button onClick={() => { URL.revokeObjectURL(media.src); setMedia(null); }}
                style={{ position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: '50%', background: 'rgba(26,26,26,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="close" size={15} stroke="#fff" />
              </button>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.9rem' }}>
            <button onClick={() => imageRef.current?.click()} className="btn btn-soft" style={{ padding: '.45rem .8rem', fontSize: '.8rem', borderRadius: 100 }}>
              <Icon name="image" size={15} stroke="var(--ink-2)" /> Photo
            </button>
            <button onClick={() => videoRef.current?.click()} className="btn btn-soft" style={{ padding: '.45rem .8rem', fontSize: '.8rem', borderRadius: 100 }}>
              <Icon name="video" size={15} stroke="var(--ink-2)" /> Video
            </button>
          </div>
        </>
      ) : (
        <>
          {/* Just Grouv: portrait preview or picker */}
          {!media ? (
            <div style={{ display: 'flex', gap: '.8rem', marginBottom: '.9rem' }}>
              {([['image', 'Photo', 'image'], ['video', 'Video', 'video']] as [string, string, string][]).map(([kind, label, icon]) => (
                <button key={kind} onClick={() => (kind === 'image' ? imageRef : videoRef).current?.click()}
                  style={{ flex: 1, padding: '1.6rem 1rem', borderRadius: 'var(--r-md)', border: '1.5px dashed var(--border-2)',
                    background: 'var(--surf-low)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.5rem' }}>
                  <span style={{ width: 42, height: 42, borderRadius: '50%', background: 'var(--ember-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name={icon} size={20} stroke="var(--ember)"/>
                  </span>
                  <span style={{ fontWeight: 600, fontSize: '.88rem' }}>{label}</span>
                  <span style={{ fontSize: '.7rem', color: 'var(--ink-4)' }}>Upload from device</span>
                </button>
              ))}
            </div>
          ) : (
            <div style={{ position: 'relative', marginBottom: '.9rem', borderRadius: 18, overflow: 'hidden', aspectRatio: '4 / 5', maxHeight: 340, background: '#2a1d12' }}>
              {media.type === 'video' ? (
                <video
                  src={media.src}
                  playsInline
                  preload="metadata"
                  muted
                  onLoadedMetadata={e => { (e.target as HTMLVideoElement).currentTime = 0.01; }}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              ) : (
                <img src={media.src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
              )}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(20,12,4,.5) 0%, transparent 30%, transparent 55%, rgba(20,12,4,.8) 100%)', pointerEvents: 'none' }}/>
              <div style={{ position: 'absolute', top: 12, left: 0, right: 0, textAlign: 'center', pointerEvents: 'none' }}>
                <div className="mono" style={{ color: '#fff', fontSize: '.8rem', letterSpacing: '.12em' }}>{nowClock()}</div>
                {user.location && (
                  <div style={{ color: 'rgba(255,255,255,.7)', fontSize: '.66rem', marginTop: 3,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                    <Icon name="pin" size={11} stroke="rgba(255,255,255,.7)"/> {user.location}
                  </div>
                )}
              </div>
              {media.type === 'video' && (
                <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                  <span style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,255,255,.9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="play" size={22} stroke="var(--ink)"/>
                  </span>
                </span>
              )}
              <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '1.2rem 1.2rem 1.3rem', textAlign: 'center' }}>
                <p className="serif" style={{ color: '#fff', fontSize: '1.25rem', fontStyle: 'italic', fontWeight: 500, lineHeight: 1.3, minHeight: '1.6em', textShadow: '0 2px 12px rgba(0,0,0,.4)' }}>
                  {caption || 'Your caption appears here…'}
                </p>
              </div>
              <button onClick={() => { URL.revokeObjectURL(media.src); setMedia(null); }}
                style={{ position: 'absolute', top: 10, right: 10, width: 30, height: 30, borderRadius: '50%', background: 'rgba(26,26,26,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="close" size={16} stroke="#fff"/>
              </button>
            </div>
          )}
          <div style={{ marginBottom: '.8rem' }}>
            <div className="label-mono" style={{ marginBottom: '.4rem' }}>Caption</div>
            <textarea value={caption} maxLength={120} onChange={e => setCaption(e.target.value)}
              placeholder="Say anything. A line is enough."
              style={{ width: '100%', minHeight: 54, resize: 'vertical', padding: '.7rem .9rem', fontSize: '.97rem', lineHeight: 1.5, background: 'var(--surf-low)', border: '1.5px solid var(--border-2)', borderRadius: 'var(--r-md)' }}
              onFocus={e => { e.target.style.borderColor = 'var(--ember)'; e.target.style.boxShadow = '0 0 0 3px var(--ember-dim)'; }}
              onBlur={e => { e.target.style.borderColor = 'var(--border-2)'; e.target.style.boxShadow = 'none'; }} />
            <div style={{ textAlign: 'right', fontSize: '.68rem', color: 'var(--ink-4)', fontFamily: 'DM Mono, monospace' }}>{caption.length}/120</div>
          </div>
        </>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '.82rem', color: 'var(--ink-2)', cursor: 'pointer' }}>
          <input type="checkbox" checked={anon} onChange={e => setAnon(e.target.checked)} style={{ accentColor: 'var(--ember)', width: 15, height: 15 }} />
          Post anonymously
        </label>
        <button className="btn btn-primary" disabled={!ready} onClick={submit} style={{ minWidth: 130 }}>
          {uploading ? 'Posting…' : mode === 'root' ? 'Root this' : 'Grouv it'}
        </button>
      </div>
    </div>
  );
}

// ── Just Grouv card ──────────────────────────────────────────────
function JustGrouvCard({ post, myId }: { post: Post; myId?: string }) {
  const router = useRouter();
  const { toast } = useToastStore();
  const postUuid = String(post.id);
  const [playing, setPlaying] = useState(false);
  const [rooted, setRooted] = useState(!!post.rooted);
  const [roots, setRoots]   = useState(post.roots ?? 0);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [showC, setShowC]           = useState(false);
  const [draft, setDraft]           = useState('');
  const [commentCount, setCommentCount] = useState(post.comments ?? 0);
  const { data: fetchedComments }   = usePostComments(showC ? postUuid : undefined);
  const addCommentMutation          = useAddComment(postUuid);
  const comments                    = fetchedComments ?? [];
  const [reportingPost, setReportingPost] = useState(false);
  const [reportingComment, setReportingComment] = useState<string | null>(null);

  const submitComment = async () => {
    if (!draft.trim() || addCommentMutation.isPending) return;
    const text = draft.trim();
    setDraft('');
    try {
      await addCommentMutation.mutateAsync(text);
      setCommentCount(n => n + 1);
    } catch {
      setDraft(text);
      toast('Comment failed — try again.');
    }
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().then(() => setPlaying(true)).catch(() => {});
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
      else      await postsApi.unreact(postUuid, '🌱');
    } catch {
      setRooted(!next);
      setRoots(n => next ? n - 1 : n + 1);
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/home`);
      toast('Link copied — share it with a Bond.');
    } catch { toast('Could not copy link.'); }
  };

  const nowClock = () => {
    const d = new Date();
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  };

  return (
    <article className="card" style={{ padding: '1.1rem 1.1rem 1.3rem', marginBottom: '.9rem' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: '.7rem', marginBottom: '.8rem' }}>
        <button onClick={() => { if (!post.anon && post.userId) router.push(`/grove/${post.userId}`); }}>
          <Avatar name={post.anon ? '' : name} anon={post.anon} size={40} avatarUrl={post.avatarUrl} aura={post.anon ? undefined : (post.aura ?? undefined)}/>
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '.92rem' }}>{name}</div>
          <div style={{ fontSize: '.72rem', color: 'var(--ink-4)', fontFamily: 'var(--mono)' }}>{post.time}</div>
        </div>
        <span className="chip" style={{ background: 'var(--ember-dim)', color: 'var(--ember-deep)', fontSize: '.62rem' }}>
          Just Grouv
        </span>
        <button onClick={() => setReportingPost(true)} title="Report"
          style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon name="flag" size={15} stroke="var(--ink-4)"/>
        </button>
      </header>

      {reportingPost && (
        <ReportModal contentType="post" contentId={postUuid} onClose={() => setReportingPost(false)}/>
      )}

      {/* Portrait frame */}
      {post.media && (
        <div onClick={() => post.media?.type === 'video' && togglePlay()}
          style={{ position: 'relative', borderRadius: 18, overflow: 'hidden',
            aspectRatio: '4 / 5', background: '#2a1d12',
            cursor: post.media.type === 'video' ? 'pointer' : 'default' }}>

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
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
          )}

          <div style={{ position: 'absolute', inset: 0,
            background: 'linear-gradient(180deg, rgba(20,12,4,.55) 0%, rgba(20,12,4,.05) 28%, rgba(20,12,4,.12) 55%, rgba(20,12,4,.82) 100%)',
            pointerEvents: 'none' }}/>

          {/* Clock + location */}
          <div style={{ position: 'absolute', top: 14, left: 0, right: 0,
            textAlign: 'center', pointerEvents: 'none' }}>
            <div className="mono" style={{ color: 'rgba(255,255,255,.92)', fontSize: '.82rem', letterSpacing: '.12em' }}>
              {post.clock ?? nowClock()}
            </div>
            {post.location && (
              <div style={{ color: 'rgba(255,255,255,.7)', fontSize: '.66rem', marginTop: 3,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                <Icon name="pin" size={11} stroke="rgba(255,255,255,.7)"/> {post.location}
              </div>
            )}
          </div>

          {/* Play/pause button — videos only */}
          {post.media.type === 'video' && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex',
              alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <div style={{ width: 58, height: 58, borderRadius: '50%', background: 'rgba(255,255,255,.9)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: playing ? 0 : 1, transition: 'opacity .25s' }}>
                <Icon name="play" size={24} stroke="var(--ink)"/>
              </div>
            </div>
          )}

          {/* Caption */}
          {post.caption && (
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0,
              padding: '1.4rem 1.3rem 1.5rem', textAlign: 'center', pointerEvents: 'none' }}>
              <p className="serif" style={{ color: '#fff', fontSize: '1.35rem', fontStyle: 'italic',
                fontWeight: 500, lineHeight: 1.3, textShadow: '0 2px 12px rgba(0,0,0,.4)' }}>
                {post.caption}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <footer style={{ marginTop: '.8rem', display: 'flex', alignItems: 'center', gap: '.4rem' }}>
        <button onClick={toggleRoot}
          style={{ display: 'flex', alignItems: 'center', gap: '.4rem', padding: '.45rem .8rem',
            borderRadius: 100, fontSize: '.84rem', fontWeight: 500,
            color: rooted ? 'var(--ember)' : 'var(--ink-3)',
            background: rooted ? 'var(--ember-dim)' : 'transparent' }}>
          <Icon name="sprout" size={17} stroke={rooted ? 'var(--ember)' : 'var(--ink-3)'}/>
          Root <span style={{ fontVariantNumeric: 'tabular-nums' }}>{roots}</span>
        </button>
        <button onClick={() => setShowC(s => !s)}
          style={{ display: 'flex', alignItems: 'center', gap: '.4rem', padding: '.45rem .8rem',
            borderRadius: 100, fontSize: '.84rem', fontWeight: 500,
            color: showC ? 'var(--slate)' : 'var(--ink-3)',
            background: showC ? 'var(--slate-dim)' : 'transparent' }}>
          <Icon name="comment" size={16} stroke={showC ? 'var(--slate)' : 'var(--ink-3)'}/>
          Comment <span style={{ fontVariantNumeric: 'tabular-nums' }}>{commentCount}</span>
        </button>
        <button onClick={handleShare}
          style={{ display: 'flex', alignItems: 'center', gap: '.4rem', padding: '.45rem .8rem',
            borderRadius: 100, fontSize: '.84rem', fontWeight: 500, color: 'var(--ink-3)' }}>
          <Icon name="share" size={16} stroke="var(--ink-3)"/> Share
        </button>
      </footer>

      {showC && (
        <div className="fade-in" style={{ marginTop: '.8rem', paddingTop: '.9rem', borderTop: '1px solid var(--border)' }}>
          {comments.map(c => (
            <div key={c.id} style={{ display: 'flex', gap: '.6rem', marginBottom: '.8rem' }}>
              <Avatar name={c.authorName} size={32} avatarUrl={c.authorAvatar} aura={c.authorAura ?? undefined}/>
              <div style={{ background: 'var(--surf-low)', borderRadius: 'var(--r-md)', padding: '.55rem .8rem', flex: 1,
                display: 'flex', alignItems: 'flex-start', gap: '.5rem' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '.8rem' }}>{c.authorName}</div>
                  <div style={{ fontSize: '.86rem', color: 'var(--ink-2)', lineHeight: 1.45 }}>{c.body}</div>
                </div>
                <button onClick={() => setReportingComment(c.id)} title="Report comment"
                  style={{ flexShrink: 0, opacity: .5, marginTop: 1 }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '.5')}>
                  <Icon name="flag" size={12} stroke="var(--ink-4)"/>
                </button>
              </div>
            </div>
          ))}
          {reportingComment && (
            <ReportModal contentType="comment" contentId={reportingComment} onClose={() => setReportingComment(null)}/>
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
              onBlur={e => { e.target.style.borderColor = 'var(--border-2)'; }}/>
            <button onClick={submitComment}
              disabled={!draft.trim() || addCommentMutation.isPending}
              className="btn btn-primary"
              style={{ padding: '.5rem .7rem', opacity: draft.trim() ? 1 : .5 }}>
              <Icon name="send" size={16} stroke="#fff"/>
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

// ── Overlap card ──
function OverlapCard() {
  const router = useRouter();
  const { toast } = useToastStore();
  const { data: overlap, isLoading } = useQuery({
    queryKey: ['space-overlap'],
    queryFn:  () => spacesApi.overlap(),
    staleTime: 5 * 60_000,
  });
  const [state, setState] = useState<'idle' | 'introduced' | 'dismissed'>('idle');
  const [busy, setBusy] = useState(false);

  if (isLoading || !overlap?.id || state === 'dismissed') return null;

  const nameA = overlap.connectionA?.displayName ?? 'Someone';
  const nameB = overlap.connectionB?.displayName ?? 'Someone';

  if (state === 'introduced') return (
    <div className="card fade-in" style={{ padding: '1.2rem 1.4rem', marginBottom: '.9rem',
      background: 'var(--green-dim)', border: '1px solid rgba(46,107,58,.2)',
      display: 'flex', alignItems: 'center', gap: '.6rem' }}>
      <Icon name="check" size={18} stroke="var(--green)"/>
      <span style={{ color: 'var(--ink-2)', fontSize: '.92rem' }}>
        Introduced. {nameA.split(' ')[0]} and {nameB.split(' ')[0]} will each get a notification.
      </span>
    </div>
  );

  return (
    <div className="card" style={{ padding: '1.2rem 1.4rem', marginBottom: '.9rem',
      background: 'linear-gradient(135deg, var(--cream), var(--ember-soft))',
      border: '1px solid var(--ember-bdr)' }}>
      <div className="label-mono" style={{ color: 'var(--ember-deep)', marginBottom: '.6rem' }}>
        A quiet observation
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', marginBottom: '.8rem' }}>
        <button onClick={() => overlap.connectionA?.id && router.push(`/grove/${overlap.connectionA.id}`)}>
          <Avatar name={nameA} size={40} avatarUrl={overlap.connectionA?.avatarUrl}/>
        </button>
        <button onClick={() => overlap.connectionB?.id && router.push(`/grove/${overlap.connectionB.id}`)} style={{ marginLeft: -12 }}>
          <Avatar name={nameB} size={40} avatarUrl={overlap.connectionB?.avatarUrl}/>
        </button>
        <p style={{ fontSize: '.92rem', color: 'var(--ink-2)' }}>
          <strong style={{ color: 'var(--ink)' }}>{nameA.split(' ')[0]}</strong> and{' '}
          <strong style={{ color: 'var(--ink)' }}>{nameB.split(' ')[0]}</strong> seem to be in a similar{' '}
          {overlap.sharedSpace
            ? <strong style={{ color: 'var(--ink)' }}>{overlap.sharedSpace}</strong>
            : 'chapter'}.
        </p>
      </div>
      <div style={{ display: 'flex', gap: '.5rem' }}>
        <button disabled={busy} className="btn btn-primary" style={{ padding: '.5rem 1rem', fontSize: '.85rem' }}
          onClick={async () => {
            setBusy(true);
            try {
              await spacesApi.introduceOverlap(overlap.id!);
              setState('introduced');
              toast(`You introduced ${nameA.split(' ')[0]} and ${nameB.split(' ')[0]}.`);
            } catch { toast('Could not introduce. Try again.'); }
            finally { setBusy(false); }
          }}>
          {busy ? 'Introducing…' : 'Introduce them'}
        </button>
        <button disabled={busy} className="btn btn-soft" style={{ padding: '.5rem 1rem', fontSize: '.85rem' }}
          onClick={() => {
            setState('dismissed');
            spacesApi.dismissOverlap(overlap.id!).catch(() => {});
          }}>
          Not now
        </button>
      </div>
    </div>
  );
}

// Convert backend PostRecord → display Post
function useDisplayPosts(records: PostRecord[] | undefined) {
  const { slugById } = useSpaceStore();
  if (!records) return [];
  return records.map(r => ({
    id: r.id as unknown as number,
    name: r.isAnonymous ? undefined : r.authorName ?? r.userId,
    anon: r.isAnonymous,
    userId: r.userId,
    avatarUrl: r.isAnonymous ? null : (r.authorAvatar ?? null),
    aura: r.isAnonymous ? null : (r.authorAura ?? null),
    clock: formatClock(r.createdAt),
    space: slugById(r.spaceId) ?? 'career',
    progress: r.progress ?? '',
    time: formatRelativeTime(r.createdAt),
    doing: r.doing ?? '',
    honest: r.honestThing ?? '',
    media: r.mediaUrl ? {
      type: (r.mediaType?.startsWith('video') ? 'video' : 'image') as 'image' | 'video',
      src: r.mediaUrl,
    } : undefined,
    roots: r.rootCount ?? 0,
    comments: r.commentCount ?? 0,
    rooted: r.userReacted ?? false,
    kind: r.kind,
    caption: r.body ?? undefined,
    location: r.authorLocation ?? undefined,
    _id: r.id,
  })) as (Post & { _id: string })[];
}

export default function HomePage() {
  const router = useRouter();
  const { user } = useUserStore();
  const { toast } = useToastStore();
  const { uuidBySlug } = useSpaceStore();
  const [tab, setTab] = useState('all');

  // Live data
  const spaceUuid = tab !== 'all' ? uuidBySlug(tab) : undefined;
  const {
    data: postPages, isLoading: postsLoading,
    fetchNextPage, hasNextPage, isFetchingNextPage,
  } = usePosts(spaceUuid);
  const postRecords = postPages?.pages.flat();
  const { data: bondsData } = useBonds();
  const { data: groupsData } = useGroups();
  const { data: suggestions } = useSuggestions();
  const inviteToBond = useInviteToBond();
  const [invited, setInvited] = useState<string[]>([]);
  const { data: sentInvitations } = useSentBondInvitations();
  const sentIds = new Set((sentInvitations ?? []).filter(i => i.status === 'pending').map(i => i.toUserId));
  const createPost = useCreatePost();
  const reactToPost = useReactToPost();

  const posts = useDisplayPosts(postRecords);
  const shown = posts; // already filtered by spaceId in the query

  // Infinite scroll: once this sentinel (rendered right after the last
  // post) enters the viewport, pull the next page instead of making the
  // reader tap a "load more" button.
  const loadMoreRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el || !hasNextPage || isFetchingNextPage) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0]?.isIntersecting) fetchNextPage();
    }, { rootMargin: '400px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, shown.length]);

  // tabs: [id, name] — space icon rendered by SpaceIcon component
  const tabs = [['all', 'All'], ...user.spaces.map(id => [id, spaceById(id).name])];

  const right = (
    <>
      <RPSection label="Suggested for you" action="View all →" onAction={() => router.push('/bonds')} suggested>
        {suggestions && suggestions.length > 0 ? (
          suggestions.slice(0, 4).map(s => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '.7rem', padding: '.5rem .4rem' }}>
              <Avatar name={s.displayName} size={38} avatarUrl={s.avatarUrl}/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, fontSize: '.86rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.displayName}</div>
                <div style={{ fontSize: '.7rem', color: 'var(--ember)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.reason}
                </div>
              </div>
              <button disabled={invited.includes(s.id) || sentIds.has(s.id) || inviteToBond.isPending}
                onClick={async () => {
                  try {
                    await inviteToBond.mutateAsync({ recipientId: s.id });
                    setInvited(v => [...v, s.id]);
                    toast(`Bond invitation sent to ${s.displayName.split(' ')[0]}.`);
                  } catch { toast('Could not send.'); }
                }}
                className="btn btn-ghost" style={{ padding: '.3rem .7rem', fontSize: '.72rem', flexShrink: 0 }}>
                {invited.includes(s.id) || sentIds.has(s.id) ? 'Sent' : 'Invite'}
              </button>
            </div>
          ))
        ) : (
          <p style={{ fontSize: '.82rem', color: 'var(--ink-4)', fontStyle: 'italic', padding: '.2rem 0' }}>
            Open a space to meet people in the same chapter.
          </p>
        )}
      </RPSection>
      <RPSection label="Active Bonds" action="View all →" onAction={() => router.push('/bonds')}>
        {bondsData?.length ? bondsData.slice(0, 3).map(b => (
          <button key={b.id} onClick={() => router.push('/bonds')}
            style={{ display: 'flex', width: '100%', alignItems: 'center', gap: '.7rem', padding: '.55rem 0', textAlign: 'left' }}>
            <Avatar name={b.otherUser?.displayName ?? '?'} size={38} avatarUrl={b.otherUser?.avatarUrl}/>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 500, fontSize: '.86rem' }}>{b.otherUser?.displayName ?? 'Bond'}</div>
              <div style={{ fontSize: '.72rem', color: 'var(--ink-3)' }}>
                {new Date(b.formedAt).toLocaleDateString()}
              </div>
            </div>
          </button>
        )) : (
          <div className="card" style={{ background: 'linear-gradient(160deg, var(--ember-dim), var(--slate-dim))' }}>
            <EmptyState variant="bonds" compact
              title="No Bonds yet."
              body="Bonds form when you consistently show up for someone."
              action={{ label: 'See how Bonds work →', onClick: () => router.push('/bonds') }}
            />
          </div>
        )}
      </RPSection>
      <RPSection label="Chapter Groups" action="Browse →" onAction={() => router.push('/groups')}>
        {groupsData && groupsData.length > 0 ? groupsData.slice(0, 3).map(g => (
          <button key={g.id} onClick={() => router.push('/groups')} className="card"
            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '.85rem', marginBottom: '.6rem', boxShadow: 'var(--shadow-soft)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', marginBottom: '.45rem' }}>
              <span style={{ width: 34, height: 34, borderRadius: '50%', background: g.coverColor ?? 'var(--ember-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name={groupIcon(g.emoji)} size={17} stroke="#fff" sw={1.5}/></span>
              <div style={{ fontWeight: 600, fontSize: '.86rem', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</div>
            </div>
            <div style={{ fontSize: '.78rem', color: 'var(--ink-3)' }}>{g.lifePhase}</div>
          </button>
        )) : (
          <div className="card" style={{ background: 'linear-gradient(160deg, var(--slate-dim), var(--green-dim))' }}>
            <EmptyState variant="groups" compact
              title="No chapter groups yet."
              body="Groups form around shared life phases. Start or join one."
              action={{ label: 'Browse groups →', onClick: () => router.push('/groups') }}
            />
          </div>
        )}
      </RPSection>
    </>
  );

  return (
    <AppShell title="Home" right={right}>
      <div style={{ maxWidth: 620, margin: '0 auto', padding: '0 1.6rem 3rem' }}>
        <div className="scroll" style={{ display: 'flex', gap: '.4rem', overflowX: 'auto', marginBottom: '1.1rem', borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
          {tabs.map(([id, name]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              padding: '.55rem .85rem', fontSize: '.88rem', fontWeight: 500, whiteSpace: 'nowrap',
              color: tab === id ? 'var(--ember)' : 'var(--ink-3)',
              borderBottom: tab === id ? '2px solid var(--ember)' : '2px solid transparent', marginBottom: -1
            }}>
              {id !== 'all' && <SpaceIcon spaceId={id} size={12}/>} {name}
            </button>
          ))}
        </div>
        <RootsComposer onPost={async (p) => {
          const spaceSlug = p.space ?? user.spaces[0] ?? 'career';
          const spaceUuid2 = uuidBySlug(spaceSlug);
          if (!spaceUuid2) { toast('Open a space first to post.'); throw new Error('No space open'); }

          const extended = p as Post & { _mediaUrl?: string; _mediaType?: string };
          const isJustGrouv = p.kind === 'just_grouw';
          try {
            await createPost.mutateAsync({
              spaceId: spaceUuid2,
              kind: isJustGrouv ? 'just_grouw' : 'roots',
              ...(p.doing     && { doing: p.doing }),
              ...(p.progress  && { progress: p.progress as Parameters<typeof createPost.mutateAsync>[0]['progress'] }),
              ...(p.honest    && { honestThing: p.honest }),
              ...(isJustGrouv && p.caption   && { body: p.caption }),
              ...(isJustGrouv && p.location  && { authorLocation: p.location }),
              isAnonymous: p.anon,
              ...(extended._mediaUrl  && { mediaUrl: extended._mediaUrl }),
              ...(extended._mediaType && { mediaType: extended._mediaType as 'image' | 'video' }),
            });
            toast(isJustGrouv ? 'Posted to Grouv.' : 'Rooted. Your circle will see it.');
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Unknown error';
            toast(`Could not post: ${msg}`);
            throw err;
          }
        }} />
        {postsLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}>
            <Spinner size={24} />
          </div>
        ) : shown.length === 0 ? (
          <div className="card" style={{ background: 'linear-gradient(160deg, var(--green-dim), var(--ember-dim))', maxWidth: 480, margin: '0 auto' }}>
            <EmptyState variant="feed"
              body={tab === 'all' ? 'Your circle hasn\'t posted yet. Root a thought above to get things going.' : 'No posts in this space yet. Be the first.'} />
          </div>
        ) : shown.map((p, i) => (
          <React.Fragment key={p.id}>
            {p.kind === 'just_grouw'
              ? <JustGrouvCard post={p} myId={user.id}/>
              : <PostCard post={p} myId={user.id}/>}
            {i === 1 && tab === 'all' && <OverlapCard />}
          </React.Fragment>
        ))}
        {/* Infinite scroll — once the fresh window runs out, this sentinel
            pulls older posts as it scrolls into view, so the feed keeps
            going instead of dead-ending. */}
        {!postsLoading && shown.length > 0 && hasNextPage && (
          <div ref={loadMoreRef} style={{ display: 'flex', justifyContent: 'center', padding: '1.5rem 0' }}>
            <Spinner size={20}/>
          </div>
        )}

        {/* End-of-feed — only once there's truly nothing older left to pull */}
        {!postsLoading && shown.length > 0 && !hasNextPage && (
          <div style={{ textAlign: 'center', padding: '3rem 1rem 1.5rem' }}>
            {/* Thin rule with centred mark */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }}/>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--border-2)', flexShrink: 0 }}/>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }}/>
            </div>
            <p className="serif" style={{
              fontSize: '1.35rem', fontWeight: 600, fontStyle: 'italic',
              color: 'var(--ink)', marginBottom: '.5rem', lineHeight: 1.3,
            }}>
              You&apos;re caught up.
            </p>
            <p style={{
              fontSize: '.84rem', color: 'var(--ink-4)',
              letterSpacing: '.015em', lineHeight: 1.6,
            }}>
              Go live something worth posting about.
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
