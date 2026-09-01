"use client";
import clsx from "clsx";
import { SpaceIcon } from "@/components/ui/SpaceIcon";
import { NavRow } from "./NavRow";
import styles from "./QuestionStep.module.css";

// ── Steps 1–3: Preset questions ──
export function QuestionStep({
  spaceId,
  spaceName,
  step,
  total,
  label,
  placeholder,
  value,
  onChange,
  onContinue,
  onSkip,
  continueLabel,
}: {
  spaceId: string;
  spaceName: string;
  step: number;
  total: number;
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  onContinue: () => void;
  onSkip: () => void;
  continueLabel: string;
}) {
  return (
    <>
      <div className={clsx("label-mono", styles.meta)}>
        <SpaceIcon spaceId={spaceId} size={12} /> {spaceName} · Question {step}{" "}
        of {total}
      </div>
      <h1 className={clsx("serif", styles.title)}>
        {label}
      </h1>
      <textarea
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={styles.textarea}
      />
      <p className={styles.hint}>
        Optional. Write as much or as little as you need.
      </p>
      <NavRow
        onSkip={onSkip}
        onContinue={onContinue}
        continueLabel={continueLabel}
      />
    </>
  );
}
