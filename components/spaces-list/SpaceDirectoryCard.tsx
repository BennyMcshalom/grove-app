"use client";
import clsx from "clsx";
import { SpaceIcon } from "@/components/ui/SpaceIcon";
import { STAGES } from "@/lib/data";
import type { Space } from "@/lib/types";
import styles from "./SpaceDirectoryCard.module.css";

export function SpaceDirectoryCard({
  s,
  isOpening,
  chapter,
  setChapter,
  submitting,
  onStartOpen,
  onCancel,
  onSubmit,
}: {
  s: Space;
  isOpening: boolean;
  chapter: string;
  setChapter: (v: string) => void;
  submitting: boolean;
  onStartOpen: () => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className={clsx("card", styles.card)}>
      <div className={styles.iconWrap}>
        <SpaceIcon spaceId={s.id} size={18} pill pillSize={40} />
      </div>
      <div className={clsx("serif", styles.name)}>
        {s.name}
      </div>
      <div className={styles.desc}>
        {s.desc}
      </div>
      {isOpening ? (
        <div className="fade-in">
          <div className={clsx("label-mono", styles.chapterLabel)}>
            Name your chapter
          </div>
          <input
            autoFocus
            value={chapter}
            onChange={(e) => setChapter(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSubmit();
            }}
            placeholder={`e.g. ${(STAGES[s.id] ?? ["Just starting"])[0]}`}
            className={styles.chapterInput}
          />
          <div className={styles.actionsRow}>
            <button
              onClick={onSubmit}
              disabled={submitting}
              className={clsx("btn", "btn-primary", styles.submitBtn)}
            >
              {submitting ? "…" : "Open chapter"}
            </button>
            <button
              onClick={onCancel}
              className={clsx("btn", "btn-soft", styles.cancelBtn)}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={onStartOpen}
          className={clsx("btn", "btn-pill", styles.joinBtn)}
        >
          Join
        </button>
      )}
    </div>
  );
}
