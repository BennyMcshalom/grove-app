"use client";
import clsx from "clsx";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/Spinner";
import { useToastStore } from "@/store/useToastStore";
import type { useInviteToBond } from "@/hooks/useBondInvitations";
import styles from "./BondCTA.module.css";

export function BondCTA({
  isOwnProfile,
  alreadyConnected,
  sent,
  setSent,
  inviteToBond,
  userId,
  firstName,
}: {
  isOwnProfile: boolean;
  alreadyConnected: boolean;
  sent: boolean;
  setSent: (v: boolean) => void;
  inviteToBond: ReturnType<typeof useInviteToBond>;
  userId: string;
  firstName: string;
}) {
  const { toast } = useToastStore();

  if (isOwnProfile || alreadyConnected) return null;

  return (
    <>
      <button
        disabled={sent || inviteToBond.isPending}
        className={clsx(
          "btn",
          "btn-primary",
          "btn-lg",
          "btn-block",
          styles.btn,
          sent && styles.sent,
        )}
        onClick={async () => {
          try {
            await inviteToBond.mutateAsync({ recipientId: userId });
            setSent(true);
            toast(`Bond invitation sent to ${firstName}.`);
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Could not send";
            if (msg.includes("409") || msg.toLowerCase().includes("already")) {
              setSent(true);
              toast(
                "You already have a Bond or pending invitation with this person.",
              );
            } else {
              toast(`Failed: ${msg}`);
            }
          }
        }}
      >
        {inviteToBond.isPending ? (
          <>
            <Spinner size={16} color="#fff" /> Sending…
          </>
        ) : sent ? (
          <>
            <Icon name="check" size={16} stroke="#fff" sw={2.5} /> Bond
            invitation sent
          </>
        ) : (
          <>
            Bond with {firstName} <Icon name="arrow" stroke="#fff" />
          </>
        )}
      </button>
      <p className={styles.note}>
        {sent
          ? "They'll see it in their notifications."
          : "A Bond is earned, not requested lightly."}
      </p>
    </>
  );
}
