"use client";
import clsx from "clsx";
import { Icon } from "@/components/ui/Icon";
import type { GroveData } from "@/lib/api";
import styles from "./OverlapPanel.module.css";

export function OverlapPanel({
  activeSpaces,
}: {
  activeSpaces: GroveData["activeSpaces"] | undefined;
}) {
  return (
    <div className={clsx("card", "fade-in", styles.card)}>
      <div className={clsx("label-mono", styles.label)}>
        <Icon name="dots" size={12} stroke="var(--ember-deep)" sw={2} /> Where
        your Grouvs overlap
      </div>
      {activeSpaces?.length ? (
        <p className={styles.text}>
          You&apos;re both navigating{" "}
          {activeSpaces
            .slice(0, 2)
            .map((s) => s.space?.name)
            .filter(Boolean)
            .join(" and ")}
          .
        </p>
      ) : (
        <p className={styles.empty}>No shared spaces found yet.</p>
      )}
    </div>
  );
}
