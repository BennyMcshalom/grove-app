"use client";
import clsx from "clsx";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/Spinner";
import styles from "./TopBar.module.css";

export function TopBar({
  isLoading,
  isOwnProfile,
  firstName,
  showOverlap,
  setShowOverlap,
  onBack,
}: {
  isLoading: boolean;
  isOwnProfile: boolean;
  firstName: string;
  showOverlap: boolean;
  setShowOverlap: (fn: (s: boolean) => boolean) => void;
  onBack: () => void;
}) {
  return (
    <div className={styles.wrap}>
      <button onClick={onBack} className={styles.backBtn}>
        <Icon name="back" size={18} stroke="var(--ink-3)" /> Back
      </button>
      <div className={clsx("label-mono", styles.center)}>
        {isLoading ? (
          <Spinner size={12} />
        ) : isOwnProfile ? (
          <span className={styles.emphasis}>This is your Grouv</span>
        ) : (
          <>
            <span>You&apos;re inside</span>{" "}
            <span className={styles.emphasis}>{firstName}&apos;s Grouv</span>
          </>
        )}
      </div>
      {!isOwnProfile && (
        <button
          onClick={() => setShowOverlap((s) => !s)}
          className={clsx(
            "chip",
            styles.overlapChip,
            showOverlap && styles.active,
          )}
        >
          <Icon
            name="dots"
            size={14}
            stroke={showOverlap ? "var(--ember-deep)" : "var(--ink-2)"}
            sw={2}
          />{" "}
          Overlap
        </button>
      )}
    </div>
  );
}
