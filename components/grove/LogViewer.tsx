"use client";
import clsx from "clsx";
import { Icon } from "@/components/ui/Icon";
import styles from "./LogViewer.module.css";

export function LogViewer({
  title,
  entries,
  onClose,
}: {
  title: string;
  entries: { date: string; mediaUrl: string | null; body: string }[];
  onClose: () => void;
}) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={clsx("scroll", styles.panel)}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <div className="label-mono">{title}</div>
          <button onClick={onClose} className={styles.closeBtn}>
            <Icon name="close" stroke="var(--ink-3)" />
          </button>
        </div>
        <div className={styles.body}>
          {entries.length === 0 && (
            <p className={styles.emptyText}>No log entries yet.</p>
          )}
          {entries.map((e, i) => (
            <article
              key={i}
              className={clsx(
                styles.entry,
                i === entries.length - 1 && styles.last,
              )}
            >
              <div className={clsx("label-mono", styles.entryLabel)}>
                Day {entries.length - i} · {e.date}
              </div>
              {e.mediaUrl && (
                <div className={styles.entryMedia}>
                  <img src={e.mediaUrl} alt="" className={styles.entryImg} />
                </div>
              )}
              <p className={clsx("serif", styles.entryBody)}>{e.body}</p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
