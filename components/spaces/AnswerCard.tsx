"use client";
import clsx from "clsx";
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { ReportModal } from "@/components/ui/ReportModal";
import {
  useLikeAnswer,
  useAnswerComments,
  useAddAnswerComment,
} from "@/hooks/useAnonAsks";
import { formatRelativeTime } from "@/lib/mappers";
import type { AnonAskAnswer } from "@/lib/api";
import { ANSWER_COLORS } from "./helpers";
import styles from "./AnswerCard.module.css";

// ── Single enriched answer with anonymous like + comment ──────────
export function AnswerCard({
  answer,
  index,
}: {
  answer: AnonAskAnswer;
  index: number;
}) {
  const [liked, setLiked] = useState(answer.userLiked);
  const [likeCount, setLikeCount] = useState(answer.likeCount ?? 0);
  const [commentCount, setCommentCount] = useState(answer.commentCount ?? 0);
  const [showComments, setShowComments] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [reporting, setReporting] = useState(false);
  const likeAnswer = useLikeAnswer();
  const addComment = useAddAnswerComment();
  const { data: comments } = useAnswerComments(
    showComments ? answer.id : undefined,
  );
  const color = ANSWER_COLORS[index % ANSWER_COLORS.length];

  const toggleLike = async () => {
    const next = !liked;
    setLiked(next);
    setLikeCount((n) => (next ? n + 1 : n - 1));
    try {
      await likeAnswer.mutateAsync(answer.id);
    } catch {
      setLiked(!next);
      setLikeCount((n) => (next ? n - 1 : n + 1));
    }
  };

  const submitComment = async () => {
    if (!commentDraft.trim() || addComment.isPending) return;
    const text = commentDraft.trim();
    setCommentDraft("");
    setCommentCount((n) => n + 1);
    try {
      await addComment.mutateAsync({ answerId: answer.id, body: text });
    } catch {
      setCommentDraft(text);
      setCommentCount((n) => n - 1);
    }
  };

  return (
    <div
      className={clsx("rise", styles.card)}
      style={{ borderLeft: `3px solid ${color}` }}
    >
      {/* Body */}
      <p className={clsx("serif", styles.body)}>
        &ldquo;{answer.body}&rdquo;
      </p>
      <div className={styles.meta}>
        <Icon name="lock" size={10} stroke="var(--ink-4)" sw={2} />
        Anonymous · {formatRelativeTime(answer.createdAt)}
      </div>

      {/* Like + comment actions */}
      <div className={styles.actions}>
        <button
          onClick={toggleLike}
          className={clsx(styles.actionBtn, styles.likeBtn, liked && styles.liked)}
        >
          <Icon
            name="heart"
            size={13}
            stroke={liked ? "var(--ember)" : "var(--ink-3)"}
            sw={liked ? 0 : 1.8}
          />
          {likeCount > 0 && (
            <span className={styles.likeCount}>
              {likeCount}
            </span>
          )}
          {likeCount === 0 && "Like"}
        </button>
        <button
          onClick={() => setShowComments((s) => !s)}
          className={clsx(styles.actionBtn, styles.commentBtn, showComments && styles.active)}
        >
          <Icon
            name="comment"
            size={13}
            stroke={showComments ? "var(--slate)" : "var(--ink-3)"}
          />
          {commentCount > 0 ? (
            <span>
              {commentCount} {commentCount === 1 ? "reply" : "replies"}
            </span>
          ) : (
            "Reply"
          )}
        </button>
        <button
          onClick={() => setReporting(true)}
          className={styles.actionBtn}
        >
          <Icon name="flag" size={12} stroke="var(--ink-3)" /> Report
        </button>
      </div>

      {reporting && (
        <ReportModal
          contentType="anon_answer"
          contentId={answer.id}
          onClose={() => setReporting(false)}
        />
      )}

      {/* Anonymous comments thread */}
      {showComments && (
        <div className={clsx("fade-in", styles.commentsThread)}>
          {(comments ?? []).map((c) => (
            <div key={c.id} className={styles.commentRow}>
              <div className={styles.commentAvatar}>
                <Icon name="lock" size={10} stroke="var(--ink-4)" sw={1.8} />
              </div>
              <div className={styles.commentBubble}>
                <p className={styles.commentText}>
                  {c.body}
                </p>
                <div className={styles.commentMeta}>
                  Anonymous · {formatRelativeTime(c.createdAt)}
                </div>
              </div>
            </div>
          ))}
          {(comments ?? []).length === 0 && !addComment.isPending && (
            <p className={styles.emptyComments}>
              No replies yet.
            </p>
          )}
          <div className={styles.commentComposer}>
            <input
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitComment();
              }}
              placeholder="Reply anonymously…"
              className={styles.commentInput}
            />
            <button
              onClick={submitComment}
              disabled={!commentDraft.trim() || addComment.isPending}
              className={clsx(styles.commentSendBtn, commentDraft.trim() && styles.filled)}
            >
              <Icon name="send" size={14} stroke="#fff" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
