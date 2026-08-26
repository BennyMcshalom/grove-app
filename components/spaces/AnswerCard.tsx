"use client";
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
      className="rise"
      style={{
        padding: "1rem 1.1rem 0",
        background: "var(--white)",
        borderRadius: "var(--r-md)",
        borderLeft: `3px solid ${color}`,
        boxShadow: "var(--shadow-soft)",
        marginBottom: ".6rem",
        overflow: "hidden",
      }}
    >
      {/* Body */}
      <p
        className="serif"
        style={{
          fontSize: "1rem",
          lineHeight: 1.65,
          color: "var(--ink)",
          marginBottom: ".5rem",
        }}
      >
        &ldquo;{answer.body}&rdquo;
      </p>
      <div
        style={{
          fontSize: ".68rem",
          color: "var(--ink-4)",
          display: "flex",
          alignItems: "center",
          gap: ".35rem",
          marginBottom: ".65rem",
        }}
      >
        <Icon name="lock" size={10} stroke="var(--ink-4)" sw={2} />
        Anonymous · {formatRelativeTime(answer.createdAt)}
      </div>

      {/* Like + comment actions */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: ".3rem",
          borderTop: "1px solid var(--border)",
          paddingTop: ".5rem",
          paddingBottom: ".55rem",
        }}
      >
        <button
          onClick={toggleLike}
          style={{
            display: "flex",
            alignItems: "center",
            gap: ".3rem",
            padding: ".35rem .65rem",
            borderRadius: 100,
            fontSize: ".78rem",
            fontWeight: 500,
            color: liked ? "var(--ember)" : "var(--ink-3)",
            background: liked ? "var(--ember-dim)" : "transparent",
            transition: "all .15s",
          }}
        >
          <Icon
            name="heart"
            size={13}
            stroke={liked ? "var(--ember)" : "var(--ink-3)"}
            sw={liked ? 0 : 1.8}
          />
          {likeCount > 0 && (
            <span style={{ fontVariantNumeric: "tabular-nums" }}>
              {likeCount}
            </span>
          )}
          {likeCount === 0 && "Like"}
        </button>
        <button
          onClick={() => setShowComments((s) => !s)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: ".3rem",
            padding: ".35rem .65rem",
            borderRadius: 100,
            fontSize: ".78rem",
            fontWeight: 500,
            color: showComments ? "var(--slate)" : "var(--ink-3)",
            background: showComments ? "var(--slate-dim)" : "transparent",
            transition: "all .15s",
          }}
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
          style={{
            display: "flex",
            alignItems: "center",
            gap: ".3rem",
            padding: ".35rem .65rem",
            borderRadius: 100,
            fontSize: ".78rem",
            fontWeight: 500,
            color: "var(--ink-3)",
          }}
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
        <div
          className="fade-in"
          style={{
            borderTop: "1px solid var(--border)",
            padding: ".7rem .2rem .7rem",
            background: "var(--surf-low)",
            margin: "0 -1.1rem",
            paddingLeft: "1.1rem",
            paddingRight: "1.1rem",
          }}
        >
          {(comments ?? []).map((c) => (
            <div
              key={c.id}
              style={{ display: "flex", gap: ".55rem", marginBottom: ".55rem" }}
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  background: "var(--border-2)",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: 1,
                }}
              >
                <Icon name="lock" size={10} stroke="var(--ink-4)" sw={1.8} />
              </div>
              <div
                style={{
                  flex: 1,
                  background: "var(--white)",
                  borderRadius: "var(--r-md)",
                  padding: ".5rem .75rem",
                }}
              >
                <p
                  style={{
                    fontSize: ".86rem",
                    color: "var(--ink-2)",
                    lineHeight: 1.45,
                  }}
                >
                  {c.body}
                </p>
                <div
                  style={{
                    fontSize: ".66rem",
                    color: "var(--ink-4)",
                    marginTop: 3,
                  }}
                >
                  Anonymous · {formatRelativeTime(c.createdAt)}
                </div>
              </div>
            </div>
          ))}
          {(comments ?? []).length === 0 && !addComment.isPending && (
            <p
              style={{
                fontSize: ".78rem",
                color: "var(--ink-4)",
                fontStyle: "italic",
                marginBottom: ".5rem",
              }}
            >
              No replies yet.
            </p>
          )}
          <div
            style={{
              display: "flex",
              gap: ".4rem",
              alignItems: "center",
              marginTop: ".3rem",
            }}
          >
            <input
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitComment();
              }}
              placeholder="Reply anonymously…"
              style={{
                flex: 1,
                padding: ".55rem .8rem",
                borderRadius: 100,
                fontSize: ".84rem",
                border: "1.5px solid var(--border-2)",
                background: "var(--white)",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "var(--sage)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "var(--border-2)";
              }}
            />
            <button
              onClick={submitComment}
              disabled={!commentDraft.trim() || addComment.isPending}
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                background: "var(--sage)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                opacity: commentDraft.trim() ? 1 : 0.45,
                transition: "opacity .15s",
              }}
            >
              <Icon name="send" size={14} stroke="#fff" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
