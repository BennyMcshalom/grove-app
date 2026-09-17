import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Billing runs on RevenueCat. The app user id is the Supabase auth user id, so
 * a plan bought on the web today also unlocks a future iOS or Android app.
 * RevenueCat is the source of truth; `subscriptions` holds its latest answer.
 */
export function billingEnabled() {
  return Boolean(
    process.env.NEXT_PUBLIC_REVENUECAT_WEB_API_KEY &&
      process.env.REVENUECAT_SECRET_API_KEY &&
      process.env.REVENUECAT_ENTITLEMENT_ID,
  );
}

const API = "https://api.revenuecat.com/v1";

interface RevenueCatEntitlement {
  expires_date: string | null;
  grace_period_expires_date: string | null;
  product_identifier: string;
  purchase_date: string;
}

interface RevenueCatSubscription {
  expires_date: string | null;
  period_type: "normal" | "trial" | "intro" | string;
  store: string;
  is_sandbox: boolean;
  unsubscribe_detected_at: string | null;
  billing_issues_detected_at: string | null;
  grace_period_expires_date: string | null;
  refunded_at: string | null;
}

interface RevenueCatSubscriber {
  entitlements: Record<string, RevenueCatEntitlement>;
  subscriptions: Record<string, RevenueCatSubscription>;
  management_url: string | null;
}

function authHeaders() {
  return { Authorization: `Bearer ${process.env.REVENUECAT_SECRET_API_KEY}`, Accept: "application/json" };
}

/** GET /subscribers creates the customer if it doesn't exist yet, which is harmless. */
export async function fetchSubscriber(userId: string): Promise<RevenueCatSubscriber> {
  const response = await fetch(`${API}/subscribers/${encodeURIComponent(userId)}`, {
    headers: authHeaders(),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new Error(`RevenueCat GET /subscribers returned ${response.status}`);
  }
  const body = (await response.json()) as { subscriber: RevenueCatSubscriber };
  return body.subscriber;
}

export type BillingState = {
  status: "trialing" | "active" | "past_due" | "canceled" | "expired" | null;
  store: string | null;
  currentPeriodEnd: string | null;
  trialEnd: string | null;
  cancelAtPeriodEnd: boolean;
  managementUrl: string | null;
};

const time = (iso: string | null) => (iso ? Date.parse(iso) : null);

/** What the full-access entitlement means for this person right now. */
export function billingState(subscriber: RevenueCatSubscriber, now = Date.now()): BillingState {
  const entitlement = subscriber.entitlements[process.env.REVENUECAT_ENTITLEMENT_ID ?? ""];
  const none: BillingState = {
    status: null,
    store: null,
    currentPeriodEnd: null,
    trialEnd: null,
    cancelAtPeriodEnd: false,
    managementUrl: null,
  };
  if (!entitlement) return none;

  // Promotional grants have no subscription row; treat them as a plan.
  const subscription = subscriber.subscriptions[entitlement.product_identifier] as RevenueCatSubscription | undefined;
  if (subscription?.is_sandbox && process.env.REVENUECAT_ALLOW_SANDBOX !== "true") return none;

  const expires = time(entitlement.expires_date);
  const grace = time(entitlement.grace_period_expires_date);
  const activeUntil = expires === null ? Infinity : Math.max(expires, grace ?? 0);
  const active = activeUntil > now;

  let status: BillingState["status"];
  if (active) {
    status = subscription?.billing_issues_detected_at
      ? "past_due"
      : subscription?.period_type === "trial"
        ? "trialing"
        : "active";
  } else {
    status = subscription?.unsubscribe_detected_at || subscription?.refunded_at ? "canceled" : "expired";
  }

  return {
    status,
    store: subscription?.store ?? "promotional",
    currentPeriodEnd: entitlement.expires_date,
    trialEnd: status === "trialing" ? entitlement.expires_date : null,
    cancelAtPeriodEnd: active && Boolean(subscription?.unsubscribe_detected_at),
    managementUrl: subscriber.management_url,
  };
}

/** Copies one person's plan from RevenueCat into Supabase. */
export async function syncBilling(userId: string): Promise<BillingState> {
  const state = billingState(await fetchSubscriber(userId));
  const { error } = await createAdminClient().rpc("sync_billing", {
    p_user_id: userId,
    p_status: state.status,
    p_store: state.store,
    p_current_period_end: state.currentPeriodEnd,
    p_trial_end: state.trialEnd,
    p_cancel_at_period_end: state.cancelAtPeriodEnd,
    p_management_url: state.managementUrl,
  });
  if (error) throw new Error(`sync_billing failed: ${error.message}`);
  return state;
}

/** Removes the customer from RevenueCat after their account is deleted. */
export async function deleteSubscriber(userId: string) {
  const response = await fetch(`${API}/subscribers/${encodeURIComponent(userId)}`, {
    method: "DELETE",
    headers: authHeaders(),
    signal: AbortSignal.timeout(10_000),
  });
  // 404 means there was nothing to delete.
  if (!response.ok && response.status !== 404) {
    throw new Error(`RevenueCat DELETE /subscribers returned ${response.status}`);
  }
}
