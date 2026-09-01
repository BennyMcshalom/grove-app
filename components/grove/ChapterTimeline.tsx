"use client";
import clsx from "clsx";
import { PHASE } from "@/lib/data";
import type { TimePhase } from "@/lib/types";
import type { GroveData } from "@/lib/api";
import styles from "./ChapterTimeline.module.css";

export function ChapterTimeline({
  phase,
  closedChapters,
  ci,
  setCi,
  chapter,
  onSelectRing,
}: {
  phase: TimePhase;
  closedChapters: GroveData["closedChapters"];
  ci: number;
  setCi: (n: number) => void;
  chapter: GroveData["closedChapters"][number] | undefined;
  onSelectRing: (key: string | null) => void;
}) {
  return (
    <div className={styles.wrap}>
      <div className={clsx("label-mono", styles.hint)}>
        Tap a ring to enter · hold the portrait to hear them ·{" "}
        {PHASE[phase].label.toLowerCase()} light
      </div>
      {closedChapters.length > 1 && (
        <>
          <div className={styles.sliderRow}>
            <span className={styles.sliderLabel}>Now</span>
            <input
              type="range"
              min="0"
              max={closedChapters.length - 1}
              value={ci}
              onChange={(e) => {
                setCi(+e.target.value);
                onSelectRing(null);
              }}
              className={styles.slider}
            />
            <span className={styles.sliderLabel}>Earlier</span>
          </div>
          {chapter && (
            <div className={styles.chapterNote}>
              Chapter in{" "}
              <strong className={styles.chapterEmphasis}>
                {chapter.space?.name ?? "Unknown"}
              </strong>
              {chapter.closedAt && (
                <>
                  {" "}
                  · closed{" "}
                  {new Date(chapter.closedAt).toLocaleDateString("en-US", {
                    month: "short",
                    year: "numeric",
                  })}
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
