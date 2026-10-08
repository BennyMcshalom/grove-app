"use client";

import { useTransition } from "react";
import { ConfirmDialog } from "@/components/app/bonds/ConfirmDialog";
import { ReportPostModal } from "@/components/app/PostModals";
import { useToast } from "@/components/app/ToastProvider";
import { blockUser } from "@/lib/bond-actions";

/**
 * "Block Jalen?" — Figma 1610:39615 (a Bond) and 1689:44046 (a match on
 * Home), toasts 1610:36757 / 1689:44027.
 */
export function BlockDialog({
  userId,
  name,
  context,
  onClose,
  onBlocked,
}: {
  userId: string;
  name: string;
  context: "bond" | "circle" | "match";
  onClose: () => void;
  onBlocked?: () => void;
}) {
  const toast = useToast();
  const [busy, start] = useTransition();
  const first = name.split(" ")[0] || name;

  return (
    <ConfirmDialog
      title={`Block ${first}?`}
      action={`Block ${first}`}
      tone="danger"
      busy={busy}
      onClose={onClose}
      onConfirm={() =>
        start(async () => {
          const result = await blockUser(userId);
          if (result.error) return void toast({ title: result.error, tone: "danger" });
          onClose();
          onBlocked?.();
          toast({
            title: `${first} blocked`,
            description: "They can no longer message or find you. Unblock anytime from Privacy & AI controls.",
            tone: "danger",
          });
        })
      }
    >
      {context === "bond"
        ? `This ends your Bond and ${first} won’t be able to message or find you again. What you shared stays as a read-only record, nothing new can be added.`
        : context === "match"
          ? `They won’t be able to message or find you, and this match will disappear from your suggestions.`
          : `${first} won’t be able to message, call, connect with or find you. You can unblock them later from Privacy & AI controls.`}
    </ConfirmDialog>
  );
}

/**
 * "Report this" for a conversation (1610:36739) or "Report this profile"
 * (1689:44028), confirmed with a toast (1610:36759 / 1689:44057).
 */
export function ReportPersonModal({
  userId,
  what,
  onClose,
}: {
  userId: string;
  what: "conversation" | "profile";
  onClose: () => void;
}) {
  const toast = useToast();
  return (
    <ReportPostModal
      postId={userId}
      targetType="profile"
      title={what === "profile" ? "Report this profile" : "Report this"}
      quiet
      onClose={onClose}
      onReported={() => {
        onClose();
        toast({
          title: "Report submitted",
          description: `We’ll review this ${what} and let you know the outcome.`,
        });
      }}
    />
  );
}
