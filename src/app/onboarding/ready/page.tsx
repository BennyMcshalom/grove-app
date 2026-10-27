import { hasPass, requireViewer } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";
import { ReadyView } from "./ReadyView";

/**
 * Onboarding 3 — "Your Grouv is ready." (Figma 56:1791), with the Season Pass
 * trial that started at activation and its end date.
 */
export default async function ReadyPage() {
  const viewer = await requireViewer();
  const supabase = await createClient();
  const { data } = await supabase
    .from("subscriptions")
    .select("status, trial_started_at, trial_ends_at")
    .eq("user_id", viewer.userId)
    .maybeSingle();

  const trialing = data?.status === "trialing" && hasPass({ ...data, current_period_end: null });
  // 14 days, or 30 for people from the waitlist (20261027100000).
  const trialDays =
    data?.trial_started_at && data.trial_ends_at
      ? Math.round((Date.parse(data.trial_ends_at) - Date.parse(data.trial_started_at)) / 86_400_000)
      : 14;
  return <ReadyView trialEndsAt={trialing ? data.trial_ends_at : null} trialDays={trialDays} />;
}
