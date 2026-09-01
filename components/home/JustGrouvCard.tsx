"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { ReportModal } from "@/components/ui/ReportModal";
import { ShareModal } from "@/components/ui/ShareModal";
import { useToastStore } from "@/store/useToastStore";
import {
  usePostComments,
  useAddComment,
  useUpdatePost,
  useDeletePost,
} from "@/hooks/usePosts";
import { postsApi } from "@/lib/api";
import type { Post } from "@/lib/types";
import styles from "./JustGrouvCard.module.css";

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
  const [draft, setDraft] = useState("");
  const [commentCount, setCommentCount] = useState(post.comments ?? 0);
  const { data: fetchedComments } = usePostComments(
    showC ? postUuid : undefined,
  );
  const addCommentMutation = useAddComment(postUuid);
  const comments = fetchedComments ?? [];
  const [reportingPost, setReportingPost] = useState(false);
  const [reportingComment, setReportingComment] = useState<string | null>(null);

  // ── Menu / Edit / Delete (own posts only) ──
  const isOwn = !!myId && post.userId === myId;
  const [menu, setMenu] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(
    null,
  );
  const [editing, setEditing] = useState(false);
  const [confirmDel, setConfirm] = useState(false);
  const [editCaption, setEditCaption] = useState(post.caption ?? "");
  const updatePost = useUpdatePost();
  const deletePost = useDeletePost();

  const saveEdit = async () => {
    if (!editCaption.trim()) return;
    try {
      await updatePost.mutateAsync({
        id: postId,
        data: { body: editCaption.trim() },
      });
      setEditing(false);
      toast("Grouv updated.");
    } catch {
      toast("Could not save changes.");
    }
  };

  const handleDelete = async () => {
    try {
      await deletePost.mutateAsync(postId);
      toast("Grouv deleted.");
    } catch {
      toast("Could not delete post.");
    }
  };

  const menuRow = (label: string, action: () => void, danger = false) => (
    <button
      key={label}
      onClick={action}
      className={clsx(styles.menuRow, danger && styles.danger)}
    >
      {label}
    </button>
  );

  const submitComment = async () => {
    if (!draft.trim() || addCommentMutation.isPending) return;
    const text = draft.trim();
    setDraft("");
    try {
      await addCommentMutation.mutateAsync(text);
      setCommentCount((n) => n + 1);
    } catch {
      setDraft(text);
      toast("Comment failed. Try again.");
    }
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play()
        .then(() => setPlaying(true))
        .catch(() => {});
    } else {
      v.pause();
      setPlaying(false);
    }
  };
  const name = post.anon ? "A connection in your space" : post.name || "";

  const toggleRoot = async () => {
    const next = !rooted;
    setRooted(next);
    setRoots((n) => (next ? n + 1 : n - 1));
    try {
      if (next) await postsApi.react(postUuid, "🌱");
      else await postsApi.unreact(postUuid, "🌱");
    } catch {
      setRooted(!next);
      setRoots((n) => (next ? n - 1 : n + 1));
    }
  };

  const [sharing, setSharing] = useState(false);

  const nowClock = () => {
    const d = new Date();
    return (
      String(d.getHours()).padStart(2, "0") +
      ":" +
      String(d.getMinutes()).padStart(2, "0")
    );
  };

  return (
    <article className={clsx("card", styles.card)}>
      <header className={styles.header}>
        <button
          onClick={() => {
            if (!post.anon && post.userId) router.push(`/grove/${post.userId}`);
          }}
        >
          <Avatar
            name={post.anon ? "" : name}
            anon={post.anon}
            size={40}
            avatarUrl={post.avatarUrl}
            aura={post.anon ? undefined : (post.aura ?? undefined)}
          />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className={styles.name}>{name}</div>
          <div className={styles.time}>{post.time}</div>
        </div>
        <span className={clsx("chip", styles.grouvChip)}>Just Grouv</span>
        {isOwn ? (
          <button
            onClick={(e) => {
              if (menu) {
                setMenu(false);
                return;
              }
              const btn = e.currentTarget.getBoundingClientRect();
              const MENU_H = 160,
                PAD = 8;
              const vw = window.innerWidth,
                vh = window.innerHeight;
              const top =
                btn.bottom + MENU_H > vh - PAD
                  ? btn.top - MENU_H
                  : btn.bottom + 4;
              const right = Math.max(PAD, vw - btn.right);
              setMenuPos({ top: Math.max(PAD, top), right });
              setMenu(true);
              setConfirm(false);
            }}
            className={styles.iconBtn}
          >
            <Icon name="dots" size={15} stroke="var(--ink-4)" />
          </button>
        ) : (
          <button
            onClick={() => setReportingPost(true)}
            title="Report"
            className={styles.iconBtn}
          >
            <Icon name="flag" size={15} stroke="var(--ink-4)" />
          </button>
        )}
      </header>

      {menu && menuPos && (
        <>
          <div className={styles.menuBackdrop} onClick={() => setMenu(false)} />
          <div
            className={clsx("fade-in", styles.menu)}
            style={{ top: menuPos.top, right: menuPos.right }}
          >
            {menuRow("Edit caption", () => {
              setMenu(false);
              setEditing(true);
              setEditCaption(post.caption ?? "");
            })}
            {menuRow(
              "Delete post",
              () => {
                setMenu(false);
                setConfirm(true);
              },
              true,
            )}
            <div className={styles.menuDivider} />
            {menuRow(
              "Report",
              () => {
                setMenu(false);
                setReportingPost(true);
              },
              true,
            )}
          </div>
        </>
      )}

      {confirmDel && (
        <div className={clsx("fade-in", styles.deleteConfirm)}>
          <span className={styles.deleteConfirmText}>Delete this post?</span>
          <button
            onClick={handleDelete}
            disabled={deletePost.isPending}
            className={clsx("btn", "btn-primary", styles.deleteConfirmBtn)}
          >
            {deletePost.isPending ? "Deleting…" : "Delete"}
          </button>
          <button
            onClick={() => setConfirm(false)}
            className={clsx("btn", "btn-soft", styles.cancelBtn)}
          >
            Cancel
          </button>
        </div>
      )}

      {editing && (
        <div className={styles.editWrap}>
          <textarea
            value={editCaption}
            onChange={(e) => setEditCaption(e.target.value)}
            maxLength={200}
            autoFocus
            className={styles.editTextarea}
          />
          <div className={styles.editActions}>
            <button
              onClick={() => setEditing(false)}
              className={clsx("btn", "btn-soft", styles.editActionBtn)}
            >
              Cancel
            </button>
            <button
              onClick={saveEdit}
              disabled={updatePost.isPending || !editCaption.trim()}
              className={clsx("btn", "btn-primary", styles.editActionBtn)}
            >
              {updatePost.isPending ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      )}

      {reportingPost && (
        <ReportModal
          contentType="post"
          contentId={postUuid}
          onClose={() => setReportingPost(false)}
        />
      )}

      {/* Portrait frame */}
      {post.media && (
        <div
          onClick={() => post.media?.type === "video" && togglePlay()}
          className={clsx(
            styles.mediaFrame,
            post.media.type === "video" && styles.clickable,
          )}
        >
          {post.media.type === "video" ? (
            <video
              ref={videoRef}
              src={post.media.src}
              playsInline
              preload="metadata"
              loop
              onLoadedMetadata={() => {
                if (videoRef.current) videoRef.current.currentTime = 0.01;
              }}
              onEnded={() => setPlaying(false)}
              className={styles.mediaVideo}
            />
          ) : (
            <img src={post.media.src} alt="" className={styles.mediaImage} />
          )}

          <div className={styles.mediaGradient} />

          {/* Clock + location */}
          <div className={styles.clockWrap}>
            <div className={clsx("mono", styles.clockText)}>
              {post.clock ?? nowClock()}
            </div>
            {post.location && (
              <div className={styles.locationRow}>
                <Icon name="pin" size={11} stroke="rgba(255,255,255,.7)" />{" "}
                {post.location}
              </div>
            )}
          </div>

          {/* Play/pause button — videos only */}
          {post.media.type === "video" && (
            <div className={styles.playOverlay}>
              <div className={clsx(styles.playBtn, playing && styles.hidden)}>
                <Icon name="play" size={24} stroke="var(--ink)" />
              </div>
            </div>
          )}

          {/* Caption */}
          {post.caption && !editing && (
            <div className={styles.captionWrap}>
              <p className={clsx("serif", styles.captionText)}>
                {post.caption}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <footer className={styles.footer}>
        <button
          onClick={toggleRoot}
          className={clsx(
            styles.actionBtn,
            styles.rootBtn,
            rooted && styles.active,
          )}
        >
          <Icon
            name="sprout"
            size={17}
            stroke={rooted ? "var(--ember)" : "var(--ink-3)"}
          />
          Root <span className={styles.tabularNum}>{roots}</span>
        </button>
        <button
          onClick={() => setShowC((s) => !s)}
          className={clsx(
            styles.actionBtn,
            styles.commentBtn,
            showC && styles.active,
          )}
        >
          <Icon
            name="comment"
            size={16}
            stroke={showC ? "var(--slate)" : "var(--ink-3)"}
          />
          Comment <span className={styles.tabularNum}>{commentCount}</span>
        </button>
        <button onClick={() => setSharing(true)} className={styles.actionBtn}>
          <Icon name="share" size={16} stroke="var(--ink-3)" /> Share
        </button>
      </footer>

      {sharing && <ShareModal post={post} onClose={() => setSharing(false)} />}

      {showC && (
        <div className={clsx("fade-in", styles.commentsWrap)}>
          {comments.map((c) => (
            <div key={c.id} className={styles.commentRow}>
              <Avatar
                name={c.authorName}
                size={32}
                avatarUrl={c.authorAvatar}
                aura={c.authorAura ?? undefined}
              />
              <div className={styles.commentBubble}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className={styles.commentAuthor}>{c.authorName}</div>
                  <div className={styles.commentBody}>{c.body}</div>
                </div>
                <button
                  onClick={() => setReportingComment(c.id)}
                  title="Report comment"
                  className={styles.reportCommentBtn}
                >
                  <Icon name="flag" size={12} stroke="var(--ink-4)" />
                </button>
              </div>
            </div>
          ))}
          {reportingComment && (
            <ReportModal
              contentType="comment"
              contentId={reportingComment}
              onClose={() => setReportingComment(null)}
            />
          )}
          {comments.length === 0 && !addCommentMutation.isPending && (
            <p className={styles.emptyComments}>
              No comments yet. Be the first.
            </p>
          )}
          <div className={styles.commentInputRow}>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitComment();
              }}
              placeholder="Add a comment…"
              className={styles.commentInput}
            />
            <button
              onClick={submitComment}
              disabled={!draft.trim() || addCommentMutation.isPending}
              className={clsx(
                "btn",
                "btn-primary",
                styles.sendBtn,
                !draft.trim() && styles.dimmed,
              )}
            >
              <Icon name="send" size={16} stroke="#fff" />
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
