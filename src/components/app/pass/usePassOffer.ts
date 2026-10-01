"use client";

import { useCallback, useEffect, useState } from "react";
import { refreshBilling } from "@/app/(app)/settings/actions";
import { isCancelled, passOffer, purchasesFor, type PassOffer, type PassPlan } from "@/lib/revenuecat-client";

/** The web key is public; without it the paywall shows plans as "opening soon". */
export const BILLING_ON = Boolean(process.env.NEXT_PUBLIC_REVENUECAT_WEB_API_KEY);

/**
 * The live Season Pass offer from RevenueCat, loaded once per mount.
 * `offer` is undefined while loading and null when billing is off or the
 * offering couldn't be read.
 */
export function usePassOffer(viewerId: string) {
  const [offer, setOffer] = useState<PassOffer | null | undefined>(BILLING_ON ? undefined : null);

  useEffect(() => {
    if (!BILLING_ON) return;
    let live = true;
    purchasesFor(viewerId)
      .then(passOffer)
      .then((o) => live && setOffer(o))
      .catch((error: unknown) => {
        console.warn("[billing] couldn't load the Season Pass offer", error);
        if (live) setOffer(null);
      });
    return () => {
      live = false;
    };
  }, [viewerId]);

  return offer;
}

export type PurchaseOutcome =
  | { kind: "cancelled" }
  | { kind: "failed" }
  | { kind: "done"; currentPeriodEnd: string | null; trialEnd: string | null; syncError?: string };

/**
 * The existing RevenueCat Web Billing path (same as Settings had): open the
 * checkout over the page, then pull the plan straight into Supabase rather
 * than wait for the webhook. `onCharged` fires between the two, for the
 * "Setting up your Season Pass…" state.
 */
export function usePurchase(viewerId: string, email: string | null) {
  return useCallback(
    async (plan: PassPlan, onCharged?: () => void): Promise<PurchaseOutcome> => {
      try {
        const purchases = await purchasesFor(viewerId);
        await purchases.purchase({ rcPackage: plan.pkg, customerEmail: email ?? undefined });
      } catch (error) {
        if (await isCancelled(error)) return { kind: "cancelled" };
        console.error("[billing] purchase failed", error);
        return { kind: "failed" };
      }
      onCharged?.();
      const result = await refreshBilling();
      return {
        kind: "done",
        currentPeriodEnd: result.currentPeriodEnd ?? null,
        trialEnd: result.trialEnd ?? null,
        syncError: result.error,
      };
    },
    [viewerId, email],
  );
}
