"use client";
import { useState, useEffect, useRef } from "react";
import clsx from "clsx";
import { Icon } from "@/components/ui/Icon";
import type { Space } from "@/lib/types";
import type { LogEntry } from "./types";
import styles from "./MemoryLightbox.module.css";

// ── Memory lightbox — open one entry full, prev/next through the log ──
export function MemoryLightbox({
  entries,
  startIndex = 0,
  space,
  onClose,
}: {
  entries: LogEntry[];
  startIndex?: number;
  space: Space;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(
    Math.max(0, Math.min(startIndex, entries.length - 1)),
  );
  const touchX = useRef<number | null>(null);
  const entry = entries[idx];
  const canPrev = idx > 0;
  const canNext = idx < entries.length - 1;
  const prev = () => canPrev && setIdx((i) => i - 1);
  const next = () => canNext && setIdx((i) => i + 1);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, entries.length]);

  if (!entry) return null;

  const onTouchStart = (e: React.TouchEvent) => {
    touchX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 50) {
      if (dx < 0) next();
      else prev();
    }
    touchX.current = null;
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      {canPrev && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            prev();
          }}
          className={clsx(styles.navBtn, styles.prev)}
        >
          <Icon name="back" size={20} stroke="#fff" />
        </button>
      )}
      {canNext && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            next();
          }}
          className={clsx(styles.navBtn, styles.next)}
        >
          <Icon name="back" size={20} stroke="#fff" />
        </button>
      )}
      <div
        className={clsx("swap-in", styles.card)}
        key={idx}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.mediaWrap}>
          {entry.media ? (
            <img src={entry.media} alt="" className={styles.mediaImg} />
          ) : (
            <div className={styles.mediaPlaceholder} />
          )}
          <button onClick={onClose} className={styles.closeBtn}>
            <Icon name="close" size={17} stroke="#fff" />
          </button>
          <div className={styles.dayBadge}>
            <span className={styles.dayIcon}>
              <Icon name={space.icon} size={15} stroke={space.ink} />
            </span>
            <span className={clsx("mono", styles.dayLabel)}>
              Day {entry.day} · {entry.date}
            </span>
          </div>
          {entries.length > 1 && (
            <span className={clsx("mono", styles.counter)}>
              {idx + 1} / {entries.length}
            </span>
          )}
        </div>
        <div className={styles.body}>
          <p className={clsx("serif", styles.text)}>{entry.text}</p>
          {entries.length > 1 && (
            <div className={styles.dots}>
              {entries.map((_, i) => (
                <span
                  key={i}
                  className={clsx(styles.dot, i === idx && styles.active)}
                />
              ))}
            </div>
          )}
          <div className={styles.hint}>
            ← → keys or swipe to move between moments
          </div>
        </div>
      </div>
    </div>
  );
}
