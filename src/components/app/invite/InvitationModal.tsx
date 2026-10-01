"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { JoinSpaceModal } from "@/components/app/JoinSpaceModal";
import { usePaywall } from "@/components/app/pass/PaywallProvider";
import { useToast } from "@/components/app/ToastProvider";
import { useViewer } from "@/components/app/ViewerProvider";
import { InvitationCard } from "@/components/app/invite/InvitationCard";
import { FormError } from "@/components/auth/FormError";
import { Button } from "@/components/ui/Button";
import { Modal, ModalClose } from "@/components/ui/Modal";
import { PersonRowsSkeleton } from "@/components/ui/Skeleton";
import { loadInvitation, respondChapterInvite } from "@/lib/invite-actions";
import { getChapter } from "@/lib/chapters";
import type { ChapterInvitation } from "@/lib/invites";

/**
 * A chapter invitation, opened in the app — Figma 1524:25315.
 *
 * "Join chapter" opens the chapter's Space for you (asking where you are in it
 * first when you don't hold it — the Join sheet, 223:14200) and puts you in
 * the sender's circle; the toast is 1526:25488. "Decline invitation" is quiet
 * for the sender; the toast is 1526:25487. A full Free member meets the
 * Season Pass paywall.
 */
export function InvitationModal({
  token,
  initial,
  onClose,
}: {
  token: string;
  initial?: ChapterInvitation | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const paywall = usePaywall();
  const { hasPass } = useViewer();
  const [invite, setInvite] = useState<ChapterInvitation | null | undefined>(initial);
  const [error, setError] = useState<string>();
  const [choosingPhase, setChoosingPhase] = useState(false);
  const [pending, startTransition] = useTransition();

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

  const chapter = invite ? getChapter(invite.chapterSlug) : undefined;
  const whose = invite ? `${invite.senderName}’s ${invite.title}` : "";

  const respond = async (accept: boolean, phase?: string): Promise<{ error?: string }> => {
    const result = await respondChapterInvite(token, accept, phase);
    if (result.needsPhase) {
      setChoosingPhase(true);
      return {};
    }
    if (result.spaceLimit) {
      setChoosingPhase(false);
      if (!hasPass) {
        paywall("space_limit");
        return {};
      }
      return { error: result.error };
    }
    if (result.error) return { error: result.error };

    if (result.status === "joined") {
      toast({ title: "You joined the chapter", description: `You’re now part of ${whose} chapter.` });
      onClose();
      if (chapter) router.push(`/spaces/${chapter.slug}`);
    } else {
      toast({
        title: "You declined chapter invitation",
        description: `You’ve declined the invitation to ${whose}. You can join later if you’re invited again.`,
        tone: "danger",
      });
      onClose();
    }
    return {};
  };

  if (choosingPhase && chapter) {
    return (
      <JoinSpaceModal
        chapter={chapter}
        onClose={() => setChoosingPhase(false)}
        onJoin={async ([phase]) => respond(true, phase)}
      />
    );
  }

  return (
    <Modal label="Chapter invitation" onClose={onClose}>
      <div className="flex justify-end">
        <ModalClose onClose={onClose} className="-mt-3 -mr-3" />
      </div>
      {invite === undefined ? (
        <PersonRowsSkeleton count={3} label="Loading invitation" />
      ) : invite === null ? (
        <p className="py-6 text-center font-sans text-base text-ink-300">
          This invitation is no longer available.
        </p>
      ) : (
        <InvitationCard
          title={invite.title}
          subtitle={`${invite.senderName} has invited you to join them in this chapter of their life`}
          photoUrls={invite.photoUrls}
          note={invite.note}
        >
          {invite.isSender ? (
            <p className="font-sans text-sm text-ink-300">This is your invitation.</p>
          ) : invite.myStatus && invite.myStatus !== "pending" ? (
            <p className="font-sans text-sm text-ink-300">
              {invite.myStatus === "accepted" ? "You joined this chapter." : "You declined this invitation."}
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              <FormError message={error} />
              <Button
                fullWidth
                loading={pending}
                onClick={() =>
                  startTransition(async () => {
                    setError(undefined);
                    setError((await respond(true)).error);
                  })
                }
              >
                Join chapter
              </Button>
              <Button
                variant="secondary"
                fullWidth
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    setError(undefined);
                    setError((await respond(false)).error);
                  })
                }
              >
                Decline invitation
              </Button>
            </div>
          )}
        </InvitationCard>
      )}
    </Modal>
  );
}
