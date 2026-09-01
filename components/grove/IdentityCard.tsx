"use client";
import clsx from "clsx";
import { Spinner } from "@/components/ui/Spinner";
import { StageChip } from "@/components/ui/StageChip";
import { AURAS } from "@/lib/data";
import type { AuraKey } from "@/lib/types";
import type { GroveData } from "@/lib/api";
import styles from "./IdentityCard.module.css";

export function IdentityCard({
  isLoading,
  name,
  isOwnProfile,
  primarySpace,
  realAura,
  editingName,
  setEditingName,
  nameDraft,
  setNameDraft,
  savingName,
  onStartEditName,
  onSaveName,
}: {
  isLoading: boolean;
  name: string;
  isOwnProfile: boolean;
  primarySpace: GroveData["activeSpaces"][number] | undefined;
  realAura: AuraKey | undefined;
  editingName: boolean;
  setEditingName: (v: boolean) => void;
  nameDraft: string;
  setNameDraft: (v: string) => void;
  savingName: boolean;
  onStartEditName: () => void;
  onSaveName: () => void;
}) {
  return (
    <div className={clsx("card", styles.card)}>
      {isLoading ? (
        <div className={styles.skeletonWrap}>
          <div className={styles.skeletonLine} />
          <div className={clsx(styles.skeletonLine, styles.short)} />
        </div>
      ) : (
        <>
          {editingName ? (
            <div className={styles.editWrap}>
              <input
                autoFocus
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onSaveName();
                  if (e.key === "Escape") setEditingName(false);
                }}
                className={styles.editInput}
              />
              <div className={styles.editActions}>
                <button
                  onClick={onSaveName}
                  disabled={savingName || !nameDraft.trim()}
                  className={clsx("btn", "btn-primary", styles.editActionBtn)}
                >
                  {savingName ? <Spinner size={12} color="#fff" /> : "Save"}
                </button>
                <button
                  onClick={() => setEditingName(false)}
                  disabled={savingName}
                  className={clsx("btn", "btn-soft", styles.editActionBtn)}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className={styles.nameRow}>
              <div className={clsx("serif", styles.name)}>{name}</div>
              {isOwnProfile && (
                <button onClick={onStartEditName} className={styles.editLink}>
                  Edit
                </button>
              )}
            </div>
          )}
          {primarySpace?.space?.slug && (
            <StageChip
              space={primarySpace.space.slug}
              stage={primarySpace.stage ?? primarySpace.space.name}
            />
          )}
          {realAura && (
            <div className={styles.auraRow}>
              <span
                className={styles.auraDot}
                style={{
                  background: AURAS[realAura].color,
                  boxShadow: `0 0 8px ${AURAS[realAura].color}`,
                }}
              />
              {AURAS[realAura].label},{" "}
              <span className={styles.auraHint}>{AURAS[realAura].hint}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
