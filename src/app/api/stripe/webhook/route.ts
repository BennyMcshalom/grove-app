import type Stripe from "stripe";
import { stripe, syncSubscription } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Stripe → Supabase. Add this endpoint in Stripe (Developers → Webhooks) with
 * the events below, and put its signing secret in STRIPE_WEBHOOK_SECRET.
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !signature) {
    return Response.json({ error: "Webhook not configured" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = await stripe().webhooks.constructEventAsync(await request.text(), signature, secret);
  } catch (error) {
    console.warn("[billing] webhook signature check failed", error);
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.client_reference_id ?? session.metadata?.user_id;
        const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
        if (userId && customerId) {
          const { error } = await createAdminClient().rpc("link_stripe_customer", {
            p_user_id: userId,
            p_customer_id: customerId,
          });
          if (error) throw new Error(`link_stripe_customer failed: ${error.message}`);
        }
        const subscriptionId =
          typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
        if (subscriptionId) await syncSubscription(subscriptionId);
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
      case "customer.subscription.paused":
      case "customer.subscription.resumed":
        await syncSubscription(event.data.object.id);
        break;
      default:
        break;
    }
  } catch (error) {
    // A 500 makes Stripe retry, which is what we want for a failed write.
    console.error(`[billing] handling ${event.type} failed`, error);
    return Response.json({ error: "Handler failed" }, { status: 500 });
  }

  return Response.json({ received: true });
}
