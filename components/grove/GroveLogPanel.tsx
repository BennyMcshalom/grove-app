"use client";
import clsx from "clsx";
import styles from "./GroveLogPanel.module.css";

type LogPreviewEntry = { date: string; mediaUrl: string | null; body: string };

export function GroveLogPanel({
  possessiveCap,
  entries,
  isLoading,
  logVisible,
  hasntPosted,
  isOwnProfile,
  onViewLog,
}: {
  possessiveCap: string;
  entries: LogPreviewEntry[];
  isLoading: boolean;
  logVisible: boolean;
  hasntPosted: string;
  isOwnProfile: boolean;
  onViewLog: () => void;
}) {
  return (
    <div className={clsx("card", styles.card)}>
      <div className={clsx("label-mono", styles.label)}>
        {possessiveCap} Grouv Log
      </div>
      {entries.length > 0 ? (
        <div className={clsx("scroll", styles.strip)}>
          {entries.map((e, i) => (
            <button key={i} onClick={onViewLog} className={styles.entryBtn}>
              <div className={styles.entryFrame}>
                {e.mediaUrl ? (
                  <>
                    <img src={e.mediaUrl} alt="" className={styles.entryImg} />
                    <div className={styles.entryGradient} />
                  </>
                ) : (
                  <span className={styles.entryTextOnly}>
                    {e.body.slice(0, 40)}…
                  </span>
                )}
                <span
                  className={clsx(
                    "mono",
                    styles.entryDate,
                    e.mediaUrl && styles.onMedia,
                  )}
                >
                  {e.date}
                </span>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <p className={styles.emptyText}>
          {isLoading
            ? "Loading…"
            : !logVisible
              ? `${possessiveCap} Grouv Log is private.`
              : hasntPosted}
        </p>
      )}
      <button
        onClick={onViewLog}
        disabled={entries.length === 0}
        className={clsx("btn", "btn-soft", "btn-block", styles.viewBtn)}
      >
        {isOwnProfile ? "Scroll your log →" : "Scroll their log →"}
      </button>
    </div>
  );
}
