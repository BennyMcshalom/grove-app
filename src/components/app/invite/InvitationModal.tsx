"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/app/ToastProvider";
import { InvitationActions } from "@/components/app/invite/InvitationActions";
import { InvitationCard } from "@/components/app/invite/InvitationCard";
import { Modal, ModalClose } from "@/components/ui/Modal";
import { PersonRowsSkeleton } from "@/components/ui/Skeleton";
import { loadInvitation } from "@/lib/invite-actions";
import type { CompanionInvitation } from "@/lib/invites";

/**
 * A chapter-companion invitation, opened in the app (from INVITATIONS or a
 * notification). Accepting opens the shared chapter; "Not now" is quiet.
 */
export function InvitationModal({
  token,
  initial,
  onClose,
}: {
  token: string;
  initial?: CompanionInvitation | null;
  onClose: () => void;
}) {
  const toast = useToast();
  const [invite, setInvite] = useState<CompanionInvitation | null | undefined>(initial);

  useEffect(() => {
    if (initial !== undefined) return;
    let cancelled = false;
    loadInvitation(token).then((result) => {
      if (!cancelled) setInvite(result);
    });
    return () => {
      cancelled = true;
    };
  }, [token, initial]);

  return (
    <Modal label="Chapter invitation" onClose={onClose}>
      <div className="-mb-4 flex justify-end">
        <ModalClose onClose={onClose} className="-mt-3 -mr-3" />
      </div>
      {invite === undefined ? (
        <PersonRowsSkeleton count={3} label="Loading invitation" />
      ) : invite === null ? (
        <p className="py-6 text-center font-sans text-base text-ink-300">This invitation is no longer available.</p>
      ) : (
        <InvitationCard
          senderName={invite.senderName}
          chapterSlug={invite.chapterSlug}
          phase={invite.phase}
          title={invite.title}
          why={invite.why}
          ask={invite.ask}
          share={invite.share}
          momentCount={invite.momentCount}
        >
          <InvitationActions
            invite={invite}
            onDone={(status) => {
              if (status === "accepted") {
                toast({ title: `You’re walking with ${invite.senderName}`, description: "Find their chapter under Chapters I’m walking with." });
              } else {
                // 1794:42612 — the sender isn't told.
                toast({
                  title: "You declined chapter invitation",
                  description: `You’ve declined the invitation to ${invite.senderName}’s ${invite.title}. You can join later if you’re invited again.`,
                });
              }
              onClose();
            }}
          />
        </InvitationCard>
      )}
    </Modal>
  );
}
