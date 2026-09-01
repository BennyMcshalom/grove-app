"use client";
import clsx from "clsx";
import { Avatar } from "@/components/ui/Avatar";
import { Spinner } from "@/components/ui/Spinner";
import { SpaceIcon } from "@/components/ui/SpaceIcon";
import type { BondRecord } from "@/lib/api";
import { PRESETS, fmtMonth } from "./helpers";
import styles from "./SummaryStep.module.css";

// ── Final step: Summary ──
export function SummaryStep({
  spaceId,
  spaceName,
  openedAt,
  closedAt,
  monthsStr,
  bonds,
  answers,
  extras,
  held,
  closing,
  onSave,
}: {
  spaceId: string;
  spaceName: string;
  openedAt: Date | null;
  closedAt: Date;
  monthsStr: string | null;
  bonds: BondRecord[];
  answers: string[];
  extras: string[];
  held: boolean;
  closing: boolean;
  onSave: () => void;
}) {
  return (
    <>
      <div className={styles.iconWrap}>
        <SpaceIcon spaceId={spaceId} size={28} pill pillSize={56} />
      </div>
      <h1 className={clsx("serif", styles.title)}>
        Chapter closed.
      </h1>
      <p className={styles.spaceLine}>
        <SpaceIcon spaceId={spaceId} size={13} /> {spaceName}
        {openedAt && ` · ${fmtMonth(openedAt)} – ${fmtMonth(closedAt)}`}
      </p>
      {monthsStr && (
        <p className={styles.monthsStr}>{monthsStr}</p>
      )}

      {/* People from bonds */}
      {bonds.length > 0 && (
        <div className={styles.bondsSection}>
          <p className={styles.bondsLabel}>
            People who were part of this chapter
          </p>
          <div className={styles.bondsRow}>
            {bonds.slice(0, 7).map((b) => (
              <div key={b.id} title={b.otherUser?.displayName ?? ""}>
                <Avatar
                  name={b.otherUser?.displayName ?? "?"}
                  avatarUrl={b.otherUser?.avatarUrl}
                  size={44}
                  ring={1}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reflection preview — show any non-empty answers */}
      {[...answers, ...extras].some((a) => a.trim()) && (
        <div className={clsx("card", styles.reflectionsCard)}>
          <div className={clsx("label-mono", styles.reflectionsLabel)}>
            Your reflections
          </div>
          {answers.map((a, i) =>
            a.trim() ? (
              <div key={i} className={styles.reflectionItem}>
                <div className={styles.reflectionItemLabel}>
                  {PRESETS[i].label}
                </div>
                <p className={styles.reflectionText}>
                  {a}
                </p>
              </div>
            ) : null,
          )}
          {extras.map((e, i) =>
            e.trim() ? (
              <div key={`extra-${i}`} className={styles.reflectionItem}>
                <div className={styles.reflectionItemLabel}>
                  Extra reflection {i + 1}
                </div>
                <p className={styles.reflectionText}>
                  {e}
                </p>
              </div>
            ) : null,
          )}
        </div>
      )}

      <div className={styles.saveSlot}>
        {held ? (
          <button
            className={clsx("btn", "btn-ghost", "btn-lg", "btn-pill", "fade-in", styles.saveBtn)}
            disabled={closing}
            onClick={onSave}
          >
            {closing ? (
              <>
                <Spinner size={16} color="var(--ink-3)" /> Saving…
              </>
            ) : (
              "Save to Life Archive"
            )}
          </button>
        ) : (
          <p className={clsx("fade-in", styles.waiting)}>
            Sit with it for a moment.
          </p>
        )}
      </div>
    </>
  );
}
