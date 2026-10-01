"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireOnboardedViewer } from "@/lib/auth/viewer";
import { sendEmail } from "@/lib/email/send";
import { referralInviteEmail } from "@/lib/email/templates";
import { billingEnabled, syncBilling } from "@/lib/revenuecat";
import { siteUrl } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";

export type PassActionResult = { error?: string };

/**
 * "Restore purchase" (paywall footer, Subscription). Web Billing has no
 * receipt to restore, so this re-reads the customer from RevenueCat — which
 * also picks up a plan bought on another device under the same account.
 */
export async function restorePurchase(): Promise<PassActionResult & { restored?: boolean }> {
  const viewer = await requireOnboardedViewer();
  if (!billingEnabled()) return { error: "Subscriptions aren't open yet." };

  try {
    const state = await syncBilling(viewer.userId);
    refresh();
    const restored = state.status === "active" || state.status === "trialing" || state.status === "past_due";
    return restored ? { restored } : { error: "We couldn't find a Season Pass on this account." };
  } catch (error) {
    console.error("[billing] restore failed", error);
    return { error: "We couldn't reach billing. Try again in a moment." };
  }
}

/** "Choose which 4 Spaces stay active" → Keep these active. */
export async function chooseActiveSpaces(userChapterIds: string[]): Promise<PassActionResult> {
  await requireOnboardedViewer();
  const ids = z.array(z.uuid()).min(1).max(4).safeParse(userChapterIds);
  if (!ids.success) return { error: "Choose up to four Spaces to keep active." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("choose_active_spaces", { p_user_chapter_ids: ids.data });
  if (error) {
    console.error("[pass] choose_active_spaces failed", error);
    if (error.hint === "chapter_limit") return { error: error.message };
    return { error: "We couldn't save your choice. Try again." };
  }
  refresh();
  return {};
}

/**
 * A paused Space's "Reactivate". `full` means Free's four are taken: the
 * client offers the chooser (swap one out) or the paywall instead.
 */
export async function resumeSpace(userChapterId: string): Promise<PassActionResult & { full?: boolean }> {
  await requireOnboardedViewer();
  const supabase = await createClient();
  const { error } = await supabase.rpc("resume_space", { p_user_chapter_id: userChapterId });
  if (error) {
    if (error.hint === "chapter_limit") return { full: true };
    console.error("[pass] resume_space failed", error);
    return { error: "We couldn't reactivate that Space. Try again." };
  }
  refresh();
  return {};
}

// ---------------------------------------------------------------------------
// Invite a friend
// ---------------------------------------------------------------------------

const EmailInviteSchema = z.object({
  name: z.string().trim().max(50, "Keep their name under 50 characters"),
  email: z.email("Enter their email address").max(254),
});

/** Invite a friend → Email. Sends the member's link from Grouv, in their name. */
export async function sendReferralEmail(
  input: z.input<typeof EmailInviteSchema>,
): Promise<PassActionResult & { fieldErrors?: Record<string, string> }> {
  const viewer = await requireOnboardedViewer();
  const parsed = EmailInviteSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { fieldErrors: { [String(issue.path[0])]: issue.message } };
  }
  if (parsed.data.email.toLowerCase() === viewer.email?.toLowerCase()) {
    return { fieldErrors: { email: "That's your own email." } };
  }

  const supabase = await createClient();
  const [{ data: referral, error: codeError }, { error: countError }] = await Promise.all([
    supabase.rpc("my_referral"),
    supabase.rpc("record_referral_invite", { p_channel: "email" }),
  ]);
  if (countError?.hint === "rate_limited") return { error: countError.message };
  const code = referral?.[0]?.code;
  if (codeError || countError || !code) {
    console.error("[referral] email invite failed", codeError ?? countError);
    return { error: "We couldn't send that invite. Try again." };
  }

  try {
    await sendEmail(
      referralInviteEmail({
        to: parsed.data.email,
        friendName: parsed.data.name || null,
        inviterName: viewer.profile.first_name,
        link: `${await siteUrl()}/r/${code}`,
      }),
    );
  } catch (error) {
    console.error("[referral] invite email failed", error);
    return { error: "We couldn't send that invite. Try again." };
  }

  refresh();
  return {};
}

/** Message / More ways to share: counts toward "Invites sent". */
export async function recordReferralShare(channel: "message" | "share"): Promise<PassActionResult> {
  await requireOnboardedViewer();
  const supabase = await createClient();
  const { error } = await supabase.rpc("record_referral_invite", { p_channel: channel });
  if (error) {
    if (error.hint === "rate_limited") return { error: error.message };
    console.error("[referral] record share failed", error);
    return { error: "We couldn't record that invite." };
  }
  refresh();
  return {};
}

/** Qualification pending → "Send a nudge". */
export async function nudgeReferral(referralId: string): Promise<PassActionResult> {
  await requireOnboardedViewer();
  const supabase = await createClient();
  const { error } = await supabase.rpc("nudge_referral", { p_referral_id: referralId });
  if (error) {
    if (error.hint === "rate_limited") return { error: error.message };
    console.error("[referral] nudge failed", error);
    return { error: "We couldn't send that nudge. Try again." };
  }
  refresh();
  return {};
}

/** Reward earned → "Claim reward": a month of Season Pass. */
export async function claimReferralReward(referralId: string): Promise<PassActionResult & { until?: string }> {
  await requireOnboardedViewer();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("claim_referral_reward", { p_referral_id: referralId });
  if (error || !data) {
    if (error?.code === "P0002") return { error: "That reward has already been claimed." };
    console.error("[referral] claim reward failed", error);
    return { error: "We couldn't add your reward. Try again." };
  }
  refresh();
  return { until: data };
}
