"use client";
import clsx from "clsx";
import { SpaceIcon } from "@/components/ui/SpaceIcon";
import styles from "./IntroStep.module.css";

// ── Step 0: Intro ──
export function IntroStep({
  spaceId,
  ready,
  onBegin,
}: {
  spaceId: string;
  ready: boolean;
  onBegin: () => void;
}) {
  return (
    <>
      <div className={styles.iconWrap}>
        <SpaceIcon spaceId={spaceId} size={28} pill pillSize={56} />
      </div>
      <h1 className={clsx("serif", styles.title)}>
        Before you close this chapter.
      </h1>
      <p className={styles.subtitle}>
        Take your time. Answer what you want. Leave what you don&apos;t.
      </p>
      {ready ? (
        <button
          className="btn btn-primary btn-lg btn-pill fade-in"
          onClick={onBegin}
        >
          Begin
        </button>
      ) : (
        <div className={styles.waiting}>
          Take a breath…
        </div>
      )}
    </>
  );
}
