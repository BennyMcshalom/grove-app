import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { InvitationCard } from "@/components/app/invite/InvitationCard";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { getViewer } from "@/lib/auth/viewer";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "A chapter invitation · Grouv",
  robots: { index: false },
};

/**
 * Recipient landing for a chapter invitation link — Figma 1524:25315.
 *
 * Signed in, the card opens inside the app (My Spaces) where you can join or
 * decline. Signed out, it shows the card and carries the invitation through
 * sign-up (/i/<token>/join sets a cookie the app shell picks up afterwards).
 */
export default async function InvitationLanding({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f]{20}$/.test(token)) notFound();

  if (await getViewer()) redirect(`/spaces?invite=${token}`);

  const supabase = await createClient();
  const { data } = await supabase.rpc("chapter_invite_card", { p_token: token });
  const card = data?.[0];
  if (!card) notFound();

  // Media is private; sign just this card's photos, an hour at a time.
  let photoUrls: string[] = [];
  if (card.photo_paths.length > 0) {
    const { data: signed } = await createAdminClient()
      .storage.from("media")
      .createSignedUrls(card.photo_paths, 60 * 60);
    photoUrls = (signed ?? []).flatMap((s) => (s.signedUrl ? [s.signedUrl] : []));
  }

  return (
    <main className="flex min-h-dvh flex-col items-center bg-ivory-100 px-4 py-8 sm:py-12">
      <Logo className="mb-8 h-10 w-auto" />
      <div className="flex w-full max-w-[660px] flex-col gap-6 rounded-2xl bg-surface p-6 sm:p-8">
        <InvitationCard
          title={card.title}
          subtitle={`${card.sender_name} has invited you to join them in this chapter of their life`}
          photoUrls={photoUrls}
          note={card.note}
        >
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
        </InvitationCard>
      </div>
    </main>
  );
}
