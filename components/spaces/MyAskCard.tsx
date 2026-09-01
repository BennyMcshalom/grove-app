"use client";
import clsx from "clsx";
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useAskAnswers } from "@/hooks/useAnonAsks";
import type { AnonAsk } from "@/lib/api";
import { daysLeft } from "./helpers";
import { AnswerCard } from "./AnswerCard";
import styles from "./MyAskCard.module.css";

// ── MyAskCard — used inside AskBoard ─────────────────────────────
export function MyAskCard({ ask }: { ask: AnonAsk }) {
  const { data: answers } = useAskAnswers(ask.id);
  const [expanded, setExpanded] = useState(false);
  const replies = answers ?? [];
  const left = daysLeft(ask.expiresAt);

  return (
    <div className={clsx("card", styles.card)}>
      <div className={styles.head}>
        <div className={styles.top}>
          <p className={clsx("serif", styles.question)}>
            &ldquo;{ask.question}&rdquo;
          </p>
          <span className={clsx("chip", styles.badge, left <= 1 && styles.urgent)}>
            {left === 0 ? "Today" : `${left}d left`}
          </span>
        </div>
        <button
          onClick={() => setExpanded((e) => !e)}
          className={clsx(styles.toggleBtn, replies.length > 0 && styles.hasReplies)}
        >
          <Icon
            name="lock"
            size={12}
            stroke={replies.length > 0 ? "var(--sage)" : "var(--ink-4)"}
            sw={2}
          />
          {replies.length === 0
            ? "No replies yet"
            : `${replies.length} honest repl${replies.length === 1 ? "y" : "ies"} · ${expanded ? "collapse" : "read"}`}
          {replies.length > 0 && (
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--sage)"
              strokeWidth="2.5"
              strokeLinecap="round"
              className={clsx(styles.chevron, expanded && styles.open)}
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          )}
        </button>
      </div>

      {expanded && replies.length > 0 && (
        <div className={styles.repliesWrap}>
          {replies.map((a, i) => (
            <AnswerCard key={a.id} answer={a} index={i} />
          ))}
          <p className={styles.footnote}>
            Fully anonymous. Even Grouv can&apos;t see who sent which reply.
          </p>
        </div>
      )}
    </div>
  );
}
