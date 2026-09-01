"use client";
import clsx from "clsx";
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/Spinner";
import { useAskAnswers, useSubmitAnswer } from "@/hooks/useAnonAsks";
import type { AnonAsk } from "@/lib/api";
import { daysLeft } from "./helpers";
import { AnswerCard } from "./AnswerCard";
import styles from "./SpaceAskCard.module.css";

// ── Single ask card for "From the Space" feed ─────────────────────
export function SpaceAskCard({
  ask,
  userName,
  toast,
}: {
  ask: AnonAsk;
  userName: string;
  toast: (m: string) => void;
}) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [draft, setDraft] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const submitAnswer = useSubmitAnswer();
  const { data: answers, isLoading: answersLoading } = useAskAnswers(
    showReplies ? ask.id : undefined,
  );
  const left = daysLeft(ask.expiresAt);
  const replyCount = answers?.length ?? 0;

  const send = async () => {
    if (!draft.trim() || submitAnswer.isPending) return;
    try {
      await submitAnswer.mutateAsync({
        id: ask.id,
        body: draft.trim(),
        authorFirstName: userName,
      });
      setDraft("");
      setSubmitted(true);
      setShowReplies(true); // auto-show replies after posting
      toast("Sent anonymously.");
    } catch {
      toast("Could not submit. Try again.");
    }
  };

  return (
    <div className={clsx("card", styles.card)}>
      {/* Question row */}
      <div className={styles.questionRow}>
        <div className={styles.lockCircle}>
          <Icon name="lock" size={15} stroke="var(--ink-4)" sw={1.8} />
        </div>
        <div className={styles.questionBody}>
          <div className={styles.questionMeta}>
            <span className={styles.someone}>
              Someone in this space
            </span>
            <span className={clsx("chip", styles.expiryChip, left <= 1 && styles.urgent)}>
              {left === 0 ? "expires today" : `${left}d`}
            </span>
          </div>
          <p className={clsx("serif", styles.questionText)}>
            &ldquo;{ask.question}&rdquo;
          </p>
        </div>
      </div>

      {/* Action bar: reply + see replies */}
      <div className={styles.actionBar}>
        {submitted ? (
          <div className={styles.sentNotice}>
            <Icon name="check" size={13} stroke="var(--sage)" sw={2.5} /> Sent
            anonymously
          </div>
        ) : (
          <button onClick={() => setReplyOpen((s) => !s)} className={styles.replyToggleBtn}>
            <Icon name="comment" size={14} stroke="var(--ink-4)" />
            {replyOpen ? "Cancel reply" : "Reply anonymously"}
          </button>
        )}
        <button
          onClick={() => setShowReplies((s) => !s)}
          className={clsx(styles.showRepliesBtn, showReplies && styles.active)}
        >
          <Icon
            name="eye"
            size={13}
            stroke={showReplies ? "var(--sage)" : "var(--ink-4)"}
          />
          {showReplies ? "Hide" : "Replies"}
          {replyCount > 0 && (
            <span className={clsx(styles.replyCountBadge, showReplies && styles.active)}>
              {replyCount}
            </span>
          )}
        </button>
      </div>

      {/* Inline reply composer */}
      {replyOpen && !submitted && (
        <div className={clsx("fade-in", styles.composerWrap)}>
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Write honestly. Your name won't be attached."
            className={styles.textarea}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send();
            }}
          />
          <div className={styles.composerActions}>
            <button
              onClick={() => {
                setReplyOpen(false);
                setDraft("");
              }}
              className={clsx("btn", "btn-soft", styles.cancelBtn)}
            >
              Cancel
            </button>
            <button
              onClick={send}
              disabled={!draft.trim() || submitAnswer.isPending}
              className={clsx(styles.sendBtn, draft.trim() && styles.ready)}
            >
              <Icon name="lock" size={14} stroke="#fff" sw={2} />
              {submitAnswer.isPending ? "Sending…" : "Send anonymously"}
            </button>
          </div>
        </div>
      )}

      {/* Replies */}
      {showReplies && (
        <div className={clsx("fade-in", styles.repliesWrap)}>
          {answersLoading ? (
            <div className={styles.repliesLoadingWrap}>
              <Spinner size={18} color="var(--sage)" />
            </div>
          ) : (answers ?? []).length === 0 ? (
            <p className={styles.repliesEmpty}>
              No replies yet. Be the first.
            </p>
          ) : (
            <>
              {(answers ?? []).map((a, i) => (
                <AnswerCard key={a.id} answer={a} index={i} />
              ))}
              <p className={styles.repliesFootnote}>
                All replies are fully anonymous.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
