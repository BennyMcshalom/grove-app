import { InviteView } from "@/components/app/pass/InviteView";
import { getShellViewer } from "@/lib/auth/viewer";
import { siteUrl } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";

/** Settings → Invite a friend (PRD "Cross — Invite a friend"; no Figma frame). */
export default async function InvitePage({ searchParams }: PageProps<"/settings/invite">) {
  await getShellViewer();
  const supabase = await createClient();
  const [{ data: mine, error }, { data: referrals }, origin, params] = await Promise.all([
    supabase.rpc("my_referral"),
    supabase.rpc("my_referrals"),
    siteUrl(),
    searchParams,
  ]);
  if (error) console.error("[referral] my_referral failed", error);
  const stats = mine?.[0];
  const openId = typeof params.referral === "string" ? params.referral : undefined;

  return (
    <InviteView
      link={stats ? `${origin}/r/${stats.code}` : `${origin}/sign-up`}
      stats={{
        invitesSent: stats?.invites_sent ?? 0,
        friendsJoined: stats?.friends_joined ?? 0,
        rewardsEarned: stats?.rewards_earned ?? 0,
      }}
      referrals={(referrals ?? []).map((r) => ({
        id: r.id,
        firstName: r.first_name,
        avatarUrl: r.avatar_url,
        status: r.status,
        joinedAt: r.joined_at,
        nudgedAt: r.nudged_at,
      }))}
      openId={openId}
    />
  );
}
