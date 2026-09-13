import { SettingsView } from "@/components/app/settings/SettingsView";
import { getShellViewer } from "@/lib/auth/viewer";
import { billingEnabled, planPriceLabel } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

/** Settings — Figma frame 390:13507. Data here; layout in SettingsView. */
export default async function SettingsPage({ searchParams }: PageProps<"/settings">) {
  const { billing: billingResult } = await searchParams;
  const viewer = await getShellViewer();
  const supabase = await createClient();

  const [{ data: prompts }, { data: preferences }, { data: profile }, { data: isStaff }, { data: subscription }, priceLabel] = await Promise.all([
    supabase
      .from("profile_prompts")
      .select("honest_tension, sitting_with, open_to")
      .eq("user_id", viewer.id)
      .maybeSingle(),
    supabase
      .from("notification_preferences")
      .select("chapter_prompt, wave_received, email_updates")
      .eq("user_id", viewer.id)
      .single(),
    supabase.from("profiles").select("theme, log_visibility").eq("id", viewer.id).single(),
    supabase.rpc("am_i_staff"),
    supabase
      .from("subscriptions")
      .select("trial_started_at, current_period_end, cancel_at_period_end, stripe_subscription_id")
      .eq("user_id", viewer.id)
      .single(),
    planPriceLabel(),
  ]);

  return (
    <SettingsView
      prompts={{
        honestTension: prompts?.honest_tension ?? null,
        sittingWith: prompts?.sitting_with ?? null,
        openTo: prompts?.open_to ?? null,
      }}
      preferences={{
        theme: profile?.theme ?? "light",
        logVisibility: profile?.log_visibility ?? "circle",
        chapterPrompt: preferences?.chapter_prompt ?? true,
        waveReceived: preferences?.wave_received ?? true,
        emailUpdates: preferences?.email_updates ?? true,
      }}
      isStaff={isStaff === true}
      billing={{
        enabled: billingEnabled(),
        priceLabel,
        trialUsed: Boolean(subscription?.trial_started_at),
        hasStripePlan: Boolean(subscription?.stripe_subscription_id),
        currentPeriodEnd: subscription?.current_period_end ?? null,
        cancelAtPeriodEnd: subscription?.cancel_at_period_end ?? false,
        justSubscribed: billingResult === "success",
      }}
    />
  );
}
