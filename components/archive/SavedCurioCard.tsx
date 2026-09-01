"use client";
import clsx from "clsx";
import { SpaceIcon } from "@/components/ui/SpaceIcon";
import type { CurioEntry } from "@/lib/api";
import styles from "./SavedCurioCard.module.css";

export function SavedCurioCard({
  curio: c,
  open,
  onToggle,
  spaceSlug,
}: {
  curio: CurioEntry;
  open: boolean;
  onToggle: () => void;
  spaceSlug: string;
}) {
  const dateStr = new Date(c.servedDate).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className={clsx("card", styles.card)}>
      <div className={styles.body}>
        {/* Header row */}
        <div className={styles.headerRow}>
          <SpaceIcon spaceId={spaceSlug} size={13} />
          <span className={clsx("label-mono", styles.dateStr)}>
            {dateStr}
          </span>
        </div>

        {/* Title */}
        {c.title && (
          <h3 className={clsx("serif", styles.title)}>
            {c.title}
          </h3>
        )}

        {/* Reflection preview */}
        {c.reflection && (
          <p className={clsx(styles.reflectionPreview, open && styles.hidden)}>
            &ldquo;{c.reflection}&rdquo;
          </p>
        )}

        {/* Expand button */}
        {(c.body || c.reflection) && (
          <button onClick={onToggle} className={styles.expandBtn}>
            {open ? "Show less" : "Read more"} →
          </button>
        )}

        {/* Expanded body */}
        {open && (
          <div className={clsx("fade-in", styles.expandedBody)}>
            {c.body && (
              <div>
                <div className={clsx("label-mono", styles.sectionLabel)}>
                  Reading
                </div>
                <p className={styles.readingText}>
                  {c.body}
                </p>
              </div>
            )}
            {c.reflection && (
              <div>
                <div className={clsx("label-mono", styles.sectionLabelSage)}>
                  Your reflection
                </div>
                <p className={styles.reflectionText}>
                  &ldquo;{c.reflection}&rdquo;
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
