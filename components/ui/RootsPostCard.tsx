'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { Avatar } from './Avatar';
import { Icon } from './Icon';
import { StageChip } from './StageChip';
import { VideoPlayer } from './VideoPlayer';
import { ReportModal } from './ReportModal';
import { ShareModal } from './ShareModal';
import { SaveToBondModal } from './SaveToBondModal';
import { useToastStore } from '@/store/useToastStore';
import { usePostComments, useAddComment, useUpdatePost, useDeletePost } from '@/hooks/usePosts';
import { postsApi } from '@/lib/api';
import type { Post } from '@/lib/types';
import styles from './RootsPostCard.module.css';

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
  const [savingToBond, setSavingToBond] = useState(false);

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
    <button key={label} onClick={action} className={clsx(styles.menuRow, danger && styles.danger)}>
      {label}
    </button>
  );

  return (
    <article className={clsx('card', styles.card)}>
      <div className={styles.mainRow}>
        <button
          onClick={() => { if (!post.anon && post.userId) router.push(`/grove/${post.userId}`); }}
          className={styles.avatarBtn}>
          <Avatar name={post.anon ? '' : name} anon={post.anon} size={40} aura={post.anon ? undefined : (post.aura ?? undefined)} avatarUrl={post.anon ? undefined : post.avatarUrl} />
        </button>

        <div className={styles.content}>
          <div className={styles.topRow}>
            <div className={styles.nameBlock}>
              <div className={styles.nameRow}>
                <span className={styles.name}>{name}</span>
                {post.progress && <StageChip space={post.space} stage={post.progress} small tone="ember" />}
              </div>
              <div className={styles.time}>{post.time}</div>
            </div>
            <div className={styles.topRowRight}>
              {showViewGrouv && !post.anon && post.userId && (
                <button onClick={() => router.push(`/grove/${post.userId}`)}
                  className={clsx('btn', 'btn-ghost', styles.viewGrouvBtn)}>
                  View Grouv
                </button>
              )}
              <button
                onClick={e => {
                  if (menu) { setMenu(false); return; }
                  const btn = e.currentTarget.getBoundingClientRect();
                  const MENU_H = isOwn ? 220 : 120;
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
                className={styles.dotsBtn}>
                <Icon name="dots" stroke="var(--ink-4)" />
              </button>
            </div>
          </div>

          {/* Delete confirmation */}
          {confirmDel && (
            <div className={clsx('fade-in', styles.deleteConfirm)}>
              <span className={styles.deleteConfirmText}>Delete this post?</span>
              <button onClick={handleDelete} disabled={deletePost.isPending}
                className={clsx('btn', 'btn-primary', styles.deleteConfirmBtn)}>
                {deletePost.isPending ? 'Deleting…' : 'Delete'}
              </button>
              <button onClick={() => setConfirm(false)} className={clsx('btn', 'btn-soft', styles.cancelBtn)}>Cancel</button>
            </div>
          )}

          {editing ? (
            <div className={styles.editWrap}>
              <textarea value={editDoing} onChange={e => setEditDoing(e.target.value)} maxLength={200} className={styles.editDoing} />
              <textarea value={editHonest} onChange={e => setEditHonest(e.target.value)} maxLength={300} className={styles.editHonest} />
              <div className={styles.editActions}>
                <button onClick={() => setEditing(false)} className={clsx('btn', 'btn-soft', styles.editActionBtn)}>Cancel</button>
                <button onClick={saveEdit} disabled={updatePost.isPending} className={clsx('btn', 'btn-primary', styles.editActionBtn)}>
                  {updatePost.isPending ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className={styles.title}>{post.doing}</p>
              <p className={styles.body}>{post.honest}</p>
            </>
          )}

          {post.media && (
            <div className={styles.mediaWrap}>
              {post.media.type === 'video'
                ? <VideoPlayer src={post.media.src} />
                : <div className={styles.mediaImageWrap}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={post.media.src} alt="" className={styles.mediaImg} />
                </div>
              }
            </div>
          )}

          <footer className={styles.footer}>
            <button onClick={toggleRoot} className={clsx(styles.actionBtn, styles.rootBtn, rooted && styles.active)}>
              <Icon name="sprout" size={17} stroke={rooted ? '#fff' : 'var(--ember-deep)'} /> Root {roots}
            </button>
            <button onClick={() => setShowC(s => !s)} className={clsx(styles.actionBtn, styles.commentBtn, showC && styles.active)}>
              <Icon name="comment" size={16} stroke={showC ? 'var(--slate)' : 'var(--ink-2)'} /> Comment {commentCount}
            </button>
            <button onClick={() => setSharing(true)} className={clsx(styles.actionBtn, styles.shareBtn)}>
              <Icon name="share" size={16} stroke="var(--ink-2)" /> Share
            </button>
          </footer>

          {showC && (
            <div className={clsx('fade-in', styles.commentsWrap)}>
              {comments.map(c => (
                <div key={c.id} className={styles.commentRow}>
                  <Avatar name={c.authorName} size={32} avatarUrl={c.authorAvatar} aura={c.authorAura ?? undefined} />
                  <div className={styles.commentBubble}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className={styles.commentAuthor}>{c.authorName}</div>
                      <div className={styles.commentBody}>{c.body}</div>
                    </div>
                    <button onClick={() => setReportingComment(c.id)} title="Report comment" className={styles.reportCommentBtn}>
                      <Icon name="flag" size={12} stroke="var(--ink-4)" />
                    </button>
                  </div>
                </div>
              ))}
              {reportingComment && (
                <ReportModal contentType="comment" contentId={reportingComment} onClose={() => setReportingComment(null)} />
              )}
              {comments.length === 0 && !addCommentMutation.isPending && (
                <p className={styles.emptyComments}>No comments yet. Be the first.</p>
              )}
              <div className={styles.commentInputRow}>
                <input value={draft} onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') submitComment(); }}
                  placeholder="Add a comment…"
                  className={styles.commentInput} />
                <button onClick={submitComment}
                  disabled={!draft.trim() || addCommentMutation.isPending}
                  className={clsx('btn', 'btn-primary', styles.sendBtn, !draft.trim() && styles.dimmed)}>
                  <Icon name="send" size={16} stroke="#fff" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {menu && menuPos && (
        <>
          <div className={styles.menuBackdrop} onClick={() => setMenu(false)} />
          <div className={clsx('fade-in', styles.menu)} style={{ top: menuPos.top, right: menuPos.right }}>
            {isOwn && menuRow('Edit Post', () => { setMenu(false); setEditing(true); setEditDoing(post.doing); setEditHonest(post.honest); })}
            {menuRow('Send to a Bond', () => { setMenu(false); setSavingToBond(true); })}
            <div className={styles.menuDivider} />
            {isOwn && menuRow('Delete Post', () => { setMenu(false); setConfirm(true); }, true)}
            {menuRow('Report Post', () => { setMenu(false); setReportingPost(true); }, true)}
          </div>
        </>
      )}

      {reportingPost && (
        <ReportModal contentType="post" contentId={postUuid} onClose={() => setReportingPost(false)} />
      )}

      {sharing && <ShareModal post={post} onClose={() => setSharing(false)} />}
      {savingToBond && <SaveToBondModal postId={postId} onClose={() => setSavingToBond(false)} />}
    </article>
  );
}
