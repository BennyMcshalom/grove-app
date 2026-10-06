import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { InvitationActions } from "@/components/app/invite/InvitationActions";
import { InvitationCard } from "@/components/app/invite/InvitationCard";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { getViewer } from "@/lib/auth/viewer";
import { loadInvitationCard } from "@/lib/companions-server";

export const metadata: Metadata = {
  title: "An invitation to walk alongside a chapter · Grouv",
  robots: { index: false },
};

/**
 * "Invitation from John" — the link an owner shares to invite someone to
 * walk alongside one of their chapters.
 *
 * Signed in, Accept invitation / Not now right here. Signed out (or not on
 * Grouv yet), the same card with "Join Grouv to accept" and "I already have an
 * account": /i/<token>/join remembers the invitation in a cookie through
 * sign-up, verification and onboarding, and brings them back here after.
 */
export default async function InvitationLanding({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f]{20}$/.test(token)) notFound();

  const viewer = await getViewer();
  const invite = await loadInvitationCard(token);
  if (!invite) notFound();

  const onboarded = Boolean(viewer?.profile.onboarded_at);

  return (
    <main className="flex min-h-dvh flex-col items-center bg-ivory-100 px-4 py-8 sm:py-12">
      <Link href={onboarded ? "/home" : "/"} aria-label="Grouv">
        <Logo className="mb-8 h-10 w-auto" />
      </Link>
      <div className="flex w-full max-w-[560px] flex-col gap-6 rounded-2xl bg-surface p-5 sm:p-8">
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
          {onboarded ? (
            <InvitationActions invite={invite} />
          ) : viewer ? (
            // Signed in, but onboarding isn't finished: finish it, then come back.
            <Button fullWidth href={`/i/${token}/join?to=onboarding`}>
              Finish joining Grouv to accept
            </Button>
          ) : invite.taken ? (
            <p className="text-center font-sans text-sm text-ink-300">This invitation has already been accepted.</p>
          ) : (
            <div className="flex flex-col gap-3">
              <Button fullWidth href={`/i/${token}/join`}>
                Join Grouv to accept
              </Button>
              <Button variant="secondary" fullWidth href={`/i/${token}/join?to=sign-in`}>
                I already have an account
              </Button>
              <p className="text-center font-sans text-xs text-ink-300">
                Every new member gets 14 days of Season Pass, free.
              </p>
            </div>
          )}
        </InvitationCard>
      </div>
    </main>
  );
}
