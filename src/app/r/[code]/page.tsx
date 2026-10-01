import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { Avatar } from "@/components/app/Avatar";
import { Button } from "@/components/ui/Button";
import { getViewer } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";

/**
 * Invitation recipient landing (PRD §4 entry point): grouv.app/r/amara92.
 * "Join" goes through ./accept, which keeps the invite in a cookie through
 * sign-up; onboarding attaches it to the new account.
 */
export default async function ReferralLanding({ params }: PageProps<"/r/[code]">) {
  const { code } = await params;
  const supabase = await createClient();
  const [{ data }, viewer] = await Promise.all([supabase.rpc("referral_inviter", { p_code: code }), getViewer()]);
  const inviter = data?.[0];

  return (
    <AuthSplitLayout>
      <div className="flex flex-col items-center gap-6 text-center">
        {inviter && (
          <Avatar src={inviter.avatar_url} name={inviter.first_name} sizes="80px" className="size-20" />
        )}
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-2xl font-semibold text-ink-800 lg:text-3xl">
            {inviter ? `${inviter.first_name} invited you to Grouv` : "You’re invited to Grouv"}
          </h1>
          <p className="font-sans text-base text-ink-400">
            Meet people in the same chapter of life as you. Your first 14 days include the full Season Pass, free — no
            card needed.
          </p>
        </div>
        {viewer ? (
          <>
            <p className="font-sans text-sm text-ink-300">You&rsquo;re already on Grouv.</p>
            <Button size="md" href="/home">
              Open Grouv
            </Button>
          </>
        ) : (
          <Button size="md" className="w-full max-w-[320px]" href={`/r/${encodeURIComponent(code)}/accept`}>
            Join {inviter ? inviter.first_name : "Grouv"}
          </Button>
        )}
      </div>
    </AuthSplitLayout>
  );
}
