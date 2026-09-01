"use client";
import clsx from "clsx";
import { Icon } from "@/components/ui/Icon";
import { spaceById } from "@/lib/data";
import type { LogEntry } from "./types";
import styles from "./Artifact.module.css";

// ── Artifact ──────────────────────────────────────────────────────
export function Artifact({
  spaceId,
  phase,
  entries,
  onClose,
}: {
  spaceId: string;
  phase: string;
  entries: LogEntry[];
  onClose: () => void;
}) {
  const space = spaceById(spaceId);
  const filled = entries.filter((e) => !e.missed);
  const range = filled.length
    ? `${filled[0].date}, ${filled[filled.length - 1].date} · `
    : "";
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={clsx("scroll", styles.modal)}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <div className={clsx("label-mono", styles.headerLabel)}>
            Preview · the Artifact
          </div>
          <button onClick={onClose} className={styles.closeBtn}>
            <Icon name="close" stroke="var(--ink-3)" />
          </button>
        </div>
        <div className={styles.body}>
          <div className={styles.titleBlock}>
            <div className={styles.iconRow}>
              <Icon name={space.icon} size={32} stroke={space.ink} sw={1.5} />
            </div>
            <h1 className={clsx("serif", styles.title)}>
              {space.name} · {phase}
            </h1>
            <div className={clsx("mono", styles.range)}>
              {range}
              {filled.length} entries stitched
            </div>
          </div>
          {filled.map((e, i) => (
            <article
              key={i}
              className={clsx(
                styles.entry,
                i === filled.length - 1 && styles.last,
              )}
            >
              <div className={clsx("label-mono", styles.entryLabel)}>
                Day {e.day} · {e.date}
              </div>
              {e.media && (
                <div className={styles.entryMedia}>
                  <img src={e.media} alt="" className={styles.entryImg} />
                </div>
              )}
              <p className={clsx("serif", styles.entryText)}>{e.text}</p>
            </article>
          ))}
          <div className={styles.footer}>
            This is a preview. The Artifact unlocks for real when you close the
            chapter, then it&apos;s yours, permanently, in your Life Archive.
          </div>
        </div>
      </div>
    </div>
  );
}
