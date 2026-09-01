"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { useToastStore } from "@/store/useToastStore";
import { spacesApi } from "@/lib/api";
import styles from "./OverlapCard.module.css";

// ── Overlap card ──
export function OverlapCard() {
  const router = useRouter();
  const { toast } = useToastStore();
  const { data: overlap, isLoading } = useQuery({
    queryKey: ["space-overlap"],
    queryFn: () => spacesApi.overlap(),
    staleTime: 5 * 60_000,
  });
  const [state, setState] = useState<"idle" | "introduced" | "dismissed">(
    "idle",
  );
  const [busy, setBusy] = useState(false);

  if (isLoading || !overlap?.id || state === "dismissed") return null;

  const nameA = overlap.connectionA?.displayName ?? "Someone";
  const nameB = overlap.connectionB?.displayName ?? "Someone";

  if (state === "introduced")
    return (
      <div className={clsx("card", "fade-in", styles.introducedCard)}>
        <Icon name="check" size={18} stroke="var(--green)" />
        <span className={styles.introducedText}>
          Introduced. {nameA.split(" ")[0]} and {nameB.split(" ")[0]} will each
          get a notification.
        </span>
      </div>
    );

  return (
    <div className={clsx("card", styles.card)}>
      <div className={clsx("label-mono", styles.observationLabel)}>
        A quiet observation
      </div>
      <div className={styles.peopleRow}>
        <button
          onClick={() =>
            overlap.connectionA?.id &&
            router.push(`/grove/${overlap.connectionA.id}`)
          }
        >
          <Avatar
            name={nameA}
            size={40}
            avatarUrl={overlap.connectionA?.avatarUrl}
          />
        </button>
        <button
          onClick={() =>
            overlap.connectionB?.id &&
            router.push(`/grove/${overlap.connectionB.id}`)
          }
          className={styles.avatarB}
        >
          <Avatar
            name={nameB}
            size={40}
            avatarUrl={overlap.connectionB?.avatarUrl}
          />
        </button>
        <p className={styles.peopleText}>
          <strong className={styles.emphasis}>{nameA.split(" ")[0]}</strong> and{" "}
          <strong className={styles.emphasis}>{nameB.split(" ")[0]}</strong>{" "}
          seem to be in a similar{" "}
          {overlap.sharedSpace ? (
            <strong className={styles.emphasis}>{overlap.sharedSpace}</strong>
          ) : (
            "chapter"
          )}
          .
        </p>
      </div>
      <div className={styles.actionsRow}>
        <button
          disabled={busy}
          className={clsx("btn", "btn-primary", styles.actionBtn)}
          onClick={async () => {
            setBusy(true);
            try {
              await spacesApi.introduceOverlap(overlap.id!);
              setState("introduced");
              toast(
                `You introduced ${nameA.split(" ")[0]} and ${nameB.split(" ")[0]}.`,
              );
            } catch {
              toast("Could not introduce. Try again.");
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Introducing…" : "Introduce them"}
        </button>
        <button
          disabled={busy}
          className={clsx("btn", "btn-soft", styles.actionBtn)}
          onClick={() => {
            setState("dismissed");
            spacesApi.dismissOverlap(overlap.id!).catch(() => {});
          }}
        >
          Not now
        </button>
      </div>
    </div>
  );
}
