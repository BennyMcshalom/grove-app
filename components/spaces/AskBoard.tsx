"use client";
import clsx from "clsx";
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { usePostAsk, useSubmitAnswer } from "@/hooks/useAnonAsks";
import type { AnonAsk } from "@/lib/api";
import { MyAskCard } from "./MyAskCard";
import { SpaceAskCard } from "./SpaceAskCard";
import styles from "./AskBoard.module.css";

// ── Full board ────────────────────────────────────────────────────
export function AskBoard({
  spaceUuid,
  myAsk,
  otherAsks,
  askText,
  setAskText,
  answerText,
  setAnswerText,
  postAsk,
  submitAnswer,
  userName,
  toast,
}: {
  spaceUuid: string | undefined;
  myAsk: AnonAsk | null;
  otherAsks: AnonAsk[];
  askText: string;
  setAskText: (v: string) => void;
  answerText: string;
  setAnswerText: (v: string) => void;
  postAsk: ReturnType<typeof usePostAsk>;
  submitAnswer: ReturnType<typeof useSubmitAnswer>;
  userName: string;
  toast: (m: string) => void;
}) {
  const [askOpen, setAskOpen] = useState(false);

  return (
    <div className={styles.wrap}>
      {/* ── SECTION 1: My Ask ── */}
      <section>
        <div className={styles.sectionHead}>
          <div className="label-mono">Your ask</div>
          {!myAsk && !askOpen && (
            <button onClick={() => setAskOpen(true)} className={styles.askLink}>
              <Icon name="plus" size={14} stroke="var(--sage)" sw={2} /> Ask
              something
            </button>
          )}
        </div>

        {myAsk ? (
          <MyAskCard ask={myAsk} />
        ) : askOpen ? (
          <div className={clsx("card", styles.composerCard)}>
            <p className={styles.composerHint}>
              Ask the space something you&apos;re sitting with. Replies come
              back without names.
            </p>
            <textarea
              autoFocus
              value={askText}
              onChange={(e) => setAskText(e.target.value)}
              placeholder="What do you actually want to know from this space?"
              className={styles.textarea}
            />
            <div className={styles.composerActions}>
              <button
                onClick={() => {
                  setAskOpen(false);
                  setAskText("");
                }}
                className={clsx("btn", "btn-soft", styles.cancelBtn)}
              >
                Cancel
              </button>
              <button
                className={clsx(styles.submitBtn, askText.trim() && !postAsk.isPending && styles.ready)}
                disabled={!askText.trim() || postAsk.isPending || !spaceUuid}
                onClick={async () => {
                  if (!spaceUuid) return;
                  try {
                    await postAsk.mutateAsync({
                      question: askText.trim(),
                      spaceId: spaceUuid,
                    });
                    setAskText("");
                    setAskOpen(false);
                    toast("Your question is live for 7 days.");
                  } catch {
                    toast("Could not post.");
                  }
                }}
              >
                <Icon name="lock" size={15} stroke="#fff" sw={2} />
                {postAsk.isPending ? "Posting…" : "Ask the space"}
              </button>
            </div>
            <p className={styles.composerFootnote}>
              Live for 7 days · Replies come back without names
            </p>
          </div>
        ) : (
          <button onClick={() => setAskOpen(true)} className={styles.dashedPrompt}>
            <span className={styles.dashedIconCircle}>
              <Icon name="comment" size={16} stroke="var(--sage)" sw={1.8} />
            </span>
            <div>
              <div className={styles.dashedTitle}>
                Ask the space something
              </div>
              <div className={styles.dashedSub}>
                Replies come back without names · 7 days
              </div>
            </div>
          </button>
        )}
      </section>

      {/* ── SECTION 2: From the space ── */}
      {otherAsks.length > 0 && (
        <section>
          <div className={clsx("label-mono", styles.spaceSectionHead)}>
            From the space · {otherAsks.length} open question
            {otherAsks.length !== 1 ? "s" : ""}
          </div>
          {otherAsks.map((ask) => (
            <SpaceAskCard
              key={ask.id}
              ask={ask}
              userName={userName}
              toast={toast}
            />
          ))}
          <p className={styles.spaceFootnote}>
            Your replies are anonymous, no one in the space, including the
            asker, knows it&apos;s you.
          </p>
        </section>
      )}

      {/* ── Empty: no asks at all ── */}
      {!myAsk && otherAsks.length === 0 && !askOpen && (
        <div className={styles.emptyWrap}>
          <p className={styles.emptyText}>
            No active questions in this space yet.
            <br />
            Be the first to ask something honest.
          </p>
        </div>
      )}
    </div>
  );
}
