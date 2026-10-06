"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FormError } from "@/components/auth/FormError";
import { Button } from "@/components/ui/Button";
import { respondCompanionInvite } from "@/lib/invite-actions";
import type { CompanionInvitation } from "@/lib/invites";

/**
 * Accept invitation / Not now — or, once it's answered (or isn't the
 * viewer's to answer), a line saying so. Accepting opens the shared chapter;
 * it never opens a Space or touches anyone's circle.
 */
export function InvitationActions({
  invite,
  onDone,
}: {
  invite: CompanionInvitation;
  /** Called after "Not now" (and before navigating on accept). */
  onDone?: (status: "accepted" | "declined") => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [answered, setAnswered] = useState<"declined" | null>(null);
  const [pending, startTransition] = useTransition();

  const note = (text: string) => <p className="text-center font-sans text-sm text-ink-300">{text}</p>;

  if (invite.isSender) return note("This is your invitation. This is exactly what they’ll see.");
  if (invite.myCompanionId) {
    return (
      <Button fullWidth href={`/walking/${invite.myCompanionId}`}>
        Open {invite.senderName}&rsquo;s chapter
      </Button>
    );
  }
  if (invite.forSomeoneElse) return note(`This invitation was meant for someone else. Ask ${invite.senderName} for your own.`);
  if (invite.taken) return note("This invitation has already been accepted.");
  if (answered === "declined" || invite.myStatus === "declined") return note("You said not now to this invitation.");
  if (invite.myStatus === "accepted") return note("You’ve answered this invitation.");

  const respond = (accept: boolean) =>
    startTransition(async () => {
      setError(undefined);
      const result = await respondCompanionInvite(invite.token, accept);
      if (result.error || !result.status) {
        setError(result.error);
        return;
      }
      onDone?.(result.status);
      if (result.status === "accepted" && result.companionId) router.push(`/walking/${result.companionId}`);
      else setAnswered("declined");
    });

  return (
    <div className="flex flex-col gap-3">
      <FormError message={error} />
      <Button fullWidth loading={pending} onClick={() => respond(true)}>
        Accept invitation
      </Button>
      <Button variant="secondary" fullWidth disabled={pending} onClick={() => respond(false)}>
        Not now
      </Button>
    </div>
  );
}
