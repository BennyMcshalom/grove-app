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
    .select("status, trial_ends_at")
    .eq("user_id", viewer.userId)
    .maybeSingle();

  const trialing = data?.status === "trialing" && hasPass({ ...data, current_period_end: null });
  return <ReadyView trialEndsAt={trialing ? data.trial_ends_at : null} />;
}
