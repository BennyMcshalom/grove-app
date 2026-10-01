"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { useViewer } from "@/components/app/ViewerProvider";
import { Paywall } from "@/components/app/pass/Paywall";
import { SpaceChooser } from "@/components/app/pass/SpaceChooser";
import type { PlanKind } from "@/lib/revenuecat-client";

/**
 * One Season Pass paywall for the whole app (Figma 1546:777…). Any gated
 * feature calls `usePaywall()(reason)` instead of rendering its own upsell;
 * `reason` names what they tried to do ("invite_bond", "bond_log", "wrapped",
 * "space_limit", "create_group", "keepsake"…) for copy and analytics.
 * An optional plan preselects it ("Choose Monthly" on Subscription).
 *
 * It also owns "Choose which 4 Spaces stay active": opened by itself once per
 * visit after a downgrade paused Spaces, or by `useSpaceChooser()(id)`.
 */
export type PaywallReason =
  | "general"
  | "invite_bond"
  | "bond_log"
  | "wrapped"
  | "space_limit"
  | "create_group"
  | "keepsake"
  | "discovery"
  | "journal_media";

type OpenPaywall = (reason?: PaywallReason, options?: { plan?: PlanKind }) => void;

const PaywallContext = createContext<OpenPaywall>(() => {});
const ChooserContext = createContext<(focusId?: string) => void>(() => {});

export function usePaywall() {
  return useContext(PaywallContext);
}

/** Opens the "choose your four active Spaces" dialog. */
export function useSpaceChooser() {
  return useContext(ChooserContext);
}

export function PaywallProvider({ children }: { children: React.ReactNode }) {
  const { spacesReviewDue } = useViewer();
  const [paywall, setPaywall] = useState<{ reason: PaywallReason; plan?: PlanKind } | null>(null);
  // `undefined` = closed; a string (possibly "") = open, focused on that Space.
  const [chooser, setChooser] = useState<string | undefined>(undefined);
  const [prompted, setPrompted] = useState(false);

  const open = useCallback<OpenPaywall>((r = "general", options) => setPaywall({ reason: r, plan: options?.plan }), []);
  const openChooser = useCallback((focusId?: string) => setChooser(focusId ?? ""), []);

  // PRD §13: at expiry, prompt them to choose — once per visit, not on every page.
  const showPrompt = spacesReviewDue && !prompted && chooser === undefined && !paywall;

  return (
    <PaywallContext.Provider value={open}>
      <ChooserContext.Provider value={openChooser}>
        {children}
        {(chooser !== undefined || showPrompt) && (
          <SpaceChooser
            focusId={chooser || undefined}
            onClose={() => {
              setPrompted(true);
              setChooser(undefined);
            }}
            onUpgrade={() => {
              setPrompted(true);
              setChooser(undefined);
              setPaywall({ reason: "space_limit" });
            }}
          />
        )}
        {paywall && <Paywall reason={paywall.reason} initialPlan={paywall.plan} onClose={() => setPaywall(null)} />}
      </ChooserContext.Provider>
    </PaywallContext.Provider>
  );
}
