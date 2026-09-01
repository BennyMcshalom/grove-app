"use client";
import clsx from "clsx";
import { Icon } from "@/components/ui/Icon";
import { SpaceIcon } from "@/components/ui/SpaceIcon";
import { NavRow } from "./NavRow";
import { ReflectionField } from "./ReflectionField";
import styles from "./ExtrasStep.module.css";

// ── Step 4: Extra thoughts (any number) ──
export function ExtrasStep({
  spaceId,
  spaceName,
  extras,
  onAddExtra,
  onUpdateExtra,
  onRemoveExtra,
  onContinue,
  onSkip,
}: {
  spaceId: string;
  spaceName: string;
  extras: string[];
  onAddExtra: () => void;
  onUpdateExtra: (i: number, v: string) => void;
  onRemoveExtra: (i: number) => void;
  onContinue: () => void;
  onSkip: () => void;
}) {
  return (
    <>
      <div className={clsx("label-mono", styles.meta)}>
        <SpaceIcon spaceId={spaceId} size={12} /> {spaceName} · Anything else?
      </div>
      <h1 className={clsx("serif", styles.title)}>
        Anything else you want to record?
      </h1>
      <p className={styles.subtitle}>
        Add as many reflections as you like, or skip right through.
      </p>

      <div className={styles.body}>
        {extras.length === 0 ? (
          <p className={styles.empty}>
            Nothing added yet.
          </p>
        ) : (
          extras.map((val, i) => (
            <ReflectionField
              key={i}
              label={`Reflection ${i + 1}`}
              value={val}
              onChange={(v) => onUpdateExtra(i, v)}
              onRemove={extras.length > 0 ? () => onRemoveExtra(i) : undefined}
              autoFocus={i === extras.length - 1 && val === ""}
            />
          ))
        )}

        <button onClick={onAddExtra} className={styles.addBtn}>
          <Icon name="plus" size={14} stroke="var(--ember)" /> Add a reflection
        </button>
      </div>

      <NavRow
        onSkip={onSkip}
        onContinue={onContinue}
        continueLabel="Close this chapter"
      />
    </>
  );
}
