import "server-only";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";

let client: Stripe | null = null;

/** True when the Stripe keys and price are configured. */
export function billingEnabled() {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID);
}

/** Created on first use, so builds without STRIPE_SECRET_KEY still work. */
export function stripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set.");
  client ??= new Stripe(key, { appInfo: { name: "Grouv" } });
  return client;
}

/** "£6.99 / month", from the configured price. Null when it can't be read. */
export async function planPriceLabel(): Promise<string | null> {
  const priceId = process.env.STRIPE_PRICE_ID;
  if (!billingEnabled() || !priceId) return null;

  try {
    const price = await stripe().prices.retrieve(priceId);
    if (price.unit_amount === null) return null;
    const amount = new Intl.NumberFormat("en", {
      style: "currency",
      currency: price.currency.toUpperCase(),
    }).format(price.unit_amount / 100);
    const interval = price.recurring?.interval;
    const count = price.recurring?.interval_count ?? 1;
    if (!interval) return amount;
    return count === 1 ? `${amount} / ${interval}` : `${amount} every ${count} ${interval}s`;
  } catch (error) {
    console.error("[billing] couldn't read the plan price", error);
    return null;
  }
}

const toIso = (seconds: number | null | undefined) =>
  seconds ? new Date(seconds * 1000).toISOString() : null;

/**
 * Copies a subscription's current state from Stripe into Supabase. Always
 * re-reads it from Stripe, so webhook events arriving out of order can't leave
 * a stale status behind.
 */
export async function syncSubscription(subscriptionId: string) {
  const subscription = await stripe().subscriptions.retrieve(subscriptionId);
  const userId = subscription.metadata.user_id;
  if (!userId) {
    console.warn(`[billing] subscription ${subscription.id} has no user_id metadata; skipped`);
    return;
  }

  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  // Billing periods live on the items since API version 2025-03-31.
  const periodEnd = Math.max(0, ...subscription.items.data.map((item) => item.current_period_end));

  const { error } = await createAdminClient().rpc("sync_stripe_subscription", {
    p_user_id: userId,
    p_customer_id: customerId,
    p_subscription_id: subscription.id,
    p_status: subscription.status,
    p_current_period_end: toIso(periodEnd),
    p_trial_end: toIso(subscription.trial_end),
    p_cancel_at_period_end: subscription.cancel_at_period_end,
  });
  if (error) throw new Error(`sync_stripe_subscription failed: ${error.message}`);
}
