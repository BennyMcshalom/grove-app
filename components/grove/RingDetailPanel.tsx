"use client";
import clsx from "clsx";
import { Spinner } from "@/components/ui/Spinner";
import type { GroveData } from "@/lib/api";
import type { Ring } from "./rings";
import styles from "./RingDetailPanel.module.css";

export function RingDetailPanel({
  active,
  rings,
  getRingContent,
  chapter,
  isOwnProfile,
  primarySpace,
  editingRing,
  setEditingRing,
  ringDraft,
  setRingDraft,
  savingRing,
  stageOptions,
  hasntFilled,
  firstName,
  onStartEditRing,
  onSaveRing,
  onSelectRing,
}: {
  active: string | null;
  rings: Ring[];
  getRingContent: (key: "inner" | "middle" | "outer") => string | null;
  chapter: GroveData["closedChapters"][number] | undefined;
  isOwnProfile: boolean;
  primarySpace: GroveData["activeSpaces"][number] | undefined;
  editingRing: boolean;
  setEditingRing: (v: boolean) => void;
  ringDraft: string;
  setRingDraft: (v: string) => void;
  savingRing: boolean;
  stageOptions: readonly string[];
  hasntFilled: string;
  firstName: string;
  onStartEditRing: () => void;
  onSaveRing: () => void;
  onSelectRing: (key: string | null) => void;
}) {
  if (!active) {
    return (
      <div className={clsx("card", styles.introCard)}>
        <p className={styles.introText}>
          {isOwnProfile
            ? "You're standing in the middle of your own Grouv."
            : `You're standing in the middle of ${firstName}'s Grouv.`}{" "}
          Each ring is a layer of where {isOwnProfile ? "you are" : "they are"},{" "}
          <span className={styles.struggling}>struggling</span>,{" "}
          <span className={styles.building}>building</span>,{" "}
          <span className={styles.openTo}>open to</span>. Step into one.
        </p>
      </div>
    );
  }

  const ring = rings.find((r) => r.key === active)!;
  const content = getRingContent(active as "inner" | "middle" | "outer");
  const chapterLearning = active === "inner" && chapter?.closingLearned;
  const canEditRing =
    isOwnProfile && (ring.field !== "building" || !!primarySpace);

  return (
    <div
      className={clsx("card", "fade-in", styles.detailCard)}
      style={{ borderLeft: `4px solid ${ring.color}` }}
    >
      <div className={styles.detailHeader}>
        <div className="label-mono" style={{ color: ring.color }}>
          {ring.label}
        </div>
        {canEditRing && !editingRing && (
          <button onClick={onStartEditRing} className={styles.editLink}>
            Edit
          </button>
        )}
      </div>

      {editingRing ? (
        <div className={styles.editWrap}>
          {ring.field === "building" ? (
            <select
              value={ringDraft}
              onChange={(e) => setRingDraft(e.target.value)}
              autoFocus
              className={styles.select}
            >
              {stageOptions.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          ) : (
            <textarea
              autoFocus
              value={ringDraft}
              onChange={(e) => setRingDraft(e.target.value)}
              maxLength={300}
              placeholder="Only your Bonds will see this…"
              className={styles.textarea}
            />
          )}
          <div className={styles.editActions}>
            <button
              onClick={onSaveRing}
              disabled={savingRing}
              className={clsx("btn", "btn-primary", styles.editActionBtn)}
            >
              {savingRing ? <Spinner size={12} color="#fff" /> : "Save"}
            </button>
            <button
              onClick={() => setEditingRing(false)}
              disabled={savingRing}
              className={clsx("btn", "btn-soft", styles.editActionBtn)}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : content ? (
        <p className={clsx("serif", styles.content)}>&ldquo;{content}&rdquo;</p>
      ) : (
        <p className={styles.emptyContent}>{hasntFilled}</p>
      )}
      {chapterLearning && (
        <>
          <div className={clsx("label-mono", styles.learningLabel)}>
            What they learned in this chapter
          </div>
          <div className={styles.learningBox}>
            &ldquo;{chapter.closingLearned}&rdquo;
          </div>
        </>
      )}
      <button onClick={() => onSelectRing(null)} className={styles.backBtn}>
        ← Step back out
      </button>
    </div>
  );
}
