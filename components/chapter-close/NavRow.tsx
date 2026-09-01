"use client";
import clsx from "clsx";
import { Icon } from "@/components/ui/Icon";
import styles from "./NavRow.module.css";

// ── Shared button row ──
export function NavRow({
  onSkip,
  onContinue,
  continueLabel = "Continue",
}: {
  onSkip: () => void;
  onContinue: () => void;
  continueLabel?: string;
}) {
  return (
    <div className={styles.row}>
      <button onClick={onSkip} className={styles.skipBtn}>
        Skip
      </button>
      <button
        onClick={onContinue}
        className={clsx("btn", "btn-primary", "btn-pill", styles.continueBtn)}
      >
        {continueLabel} <Icon name="arrow" stroke="#fff" size={16} />
      </button>
    </div>
  );
}
