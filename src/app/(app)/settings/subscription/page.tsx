import { SubscriptionView } from "@/components/app/pass/SubscriptionView";
import { getShellViewer, hasPass } from "@/lib/auth/viewer";
import { requestTime } from "@/lib/pass";
import { billingEnabled } from "@/lib/revenuecat";
import { createClient } from "@/lib/supabase/server";

/** Settings → Subscription — Figma 1545:22030 / 1549:777 / 1549:1153 / 1550:777 / 1550:1153 / 1550:1296. */
export default async function SubscriptionPage() {
  const viewer = await getShellViewer();
  const supabase = await createClient();
  const { data: s } = await supabase
    .from("subscriptions")
    .select(
      "status, plan, trial_started_at, trial_ends_at, current_period_end, cancel_at_period_end, billing_store, bonus_until",
    )
    .eq("user_id", viewer.id)
    .single();

  return (
    <SubscriptionView
      info={{
        status: s?.status ?? "none",
        plan: s?.plan ?? null,
        trialStartedAt: s?.trial_started_at ?? null,
        trialEndsAt: s?.trial_ends_at ?? null,
        currentPeriodEnd: s?.current_period_end ?? null,
        cancelAtPeriodEnd: s?.cancel_at_period_end ?? false,
        store: s?.billing_store ?? null,
        bonusUntil: s?.bonus_until ?? null,
        hasPass: hasPass(s),
        billingEnabled: billingEnabled(),
        now: requestTime(),
      }}
    />
  );
}
