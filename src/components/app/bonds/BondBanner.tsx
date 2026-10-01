"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { CheckinModal, InviteToBondModal, useRespondToInvite } from "@/components/app/bonds/BondModals";
import { usePaywall } from "@/components/app/pass/PaywallProvider";
import { useToast } from "@/components/app/ToastProvider";
import { useViewer } from "@/components/app/ViewerProvider";
import { withdrawBondInvite } from "@/lib/bond-actions";
import { goalSpan, type BondPerson } from "@/lib/bonds";

/**
 * The strip under the chat header.
 *
 * A Bond: SHARED GOAL, its check-ins and depth bar, "Log a check-in · View
 * Bond details" (Figma 1093:22073). Someone in your circle: "Make it official
 * — Invite to Bond" on the Season Pass (1075:19428), "How a Bond forms —
 * Upgrade account to Invite to Bond" on Free (452:10158), or the invite in
 * flight between you.
 */
export function BondBanner({ person }: { person: BondPerson }) {
  const { hasPass } = useViewer();
  const paywall = usePaywall();
  const toast = useToast();
  const respond = useRespondToInvite();
  const [inviting, setInviting] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [busy, start] = useTransition();

  if (person.relationship === "bond" && person.bondId) {
    const details = `/bonds/${person.bondId}`;
    return (
      <Strip>
        <span className="font-sans text-xs font-semibold text-ink-700 uppercase">Shared goal</span>
        {person.sharedGoal ? (
          <>
            <p className="font-sans text-sm text-ink-600">{person.sharedGoal}</p>
            <div className="flex items-center gap-3">
              <span className="shrink-0 font-sans text-xs text-ink-400">
                {person.checkinCount} shared {person.checkinCount === 1 ? "check-in" : "check-ins"}
              </span>
              <DepthBar level={person.depthLevel ?? 10} />
              <span className="shrink-0 font-sans text-xs text-ink-400">
                {goalSpan(person.goalHorizonMonths, person.since)}
              </span>
            </div>
          </>
        ) : (
          <p className="font-sans text-sm text-ink-400">
            {hasPass ? "No shared goal yet. Set one together from Bond details." : `You and ${person.name} formed this Bond naturally.`}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
          <button
            type="button"
            onClick={() => (hasPass ? setCheckingIn(true) : paywall("invite_bond"))}
            className="font-sans text-sm font-medium text-primary-600 hover:underline"
          >
            {!hasPass && <Lock />}Log a check-in
          </button>
          <Link href={details} className="font-sans text-sm font-medium text-primary-600 hover:underline">
            View Bond details
          </Link>
        </div>
        {checkingIn && <CheckinModal bondId={person.bondId} name={person.name} onClose={() => setCheckingIn(false)} />}
      </Strip>
    );
  }

  const invite = person.invite;
  if (invite?.fromMe) {
    return (
      <Strip>
        <span className="font-sans text-sm font-semibold text-ink-700">Bond invite sent</span>
        <p className="font-sans text-xs text-ink-400">
          Waiting for {person.name} to respond{invite.goal ? ` · Goal: ${invite.goal}` : ""}.
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            start(async () => {
              const result = await withdrawBondInvite(invite.id);
              toast(result.error ? { title: result.error, tone: "danger" } : { title: "Bond invite withdrawn" });
            })
          }
          className="w-fit font-sans text-sm font-medium text-primary-600 hover:underline disabled:opacity-50"
        >
          Withdraw invite
        </button>
      </Strip>
    );
  }

  if (invite) {
    return (
      <Strip>
        <span className="font-sans text-sm font-semibold text-ink-700">{person.name} invited you to a Bond</span>
        {invite.goal && <p className="font-sans text-xs text-ink-400">Goal: {invite.goal}</p>}
        <div className="flex items-center gap-5">
          <button
            type="button"
            disabled={busy}
            onClick={() => start(async () => void (await respond(invite.id, true, person.name)))}
            className="font-sans text-sm font-medium text-primary-600 hover:underline disabled:opacity-50"
          >
            {!hasPass && <Lock />}Accept
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => start(async () => void (await respond(invite.id, false, person.name)))}
            className="font-sans text-sm font-medium text-ink-400 hover:underline disabled:opacity-50"
          >
            Decline
          </button>
        </div>
      </Strip>
    );
  }

  return (
    <Strip>
      <span className="font-sans text-sm font-semibold text-ink-700">
        {hasPass ? "Make it official" : "How a Bond forms"}
      </span>
      <p className="font-sans text-xs text-ink-400">
        {hasPass
          ? `You and ${person.name} have built a meaningful connection through your conversations and shared experiences. Ready to make it a Bond?`
          : `You and ${person.name} are building a Bond naturally through your conversations and interactions. Want to make it official instead?`}
      </p>
      {hasPass ? (
        <button
          type="button"
          onClick={() => setInviting(true)}
          className="w-fit font-sans text-sm font-medium text-primary-600 hover:underline"
        >
          Invite to Bond
        </button>
      ) : (
        <p className="font-sans text-xs text-ink-600">
          <button
            type="button"
            onClick={() => paywall("invite_bond")}
            className="font-medium text-primary-600 hover:underline"
          >
            <Lock />
            Upgrade account
          </button>{" "}
          to Invite to Bond
        </p>
      )}
      {inviting && <InviteToBondModal userId={person.userId} name={person.name} onClose={() => setInviting(false)} />}
    </Strip>
  );
}

function Strip({ children }: { children: React.ReactNode }) {
  return <div className="flex shrink-0 flex-col gap-1.5 border-b border-ink-50 bg-ivory-200 px-5 py-3">{children}</div>;
}

/** A coarse depth bar — never a number (PRD D8). */
export function DepthBar({ level, className }: { level: number; className?: string }) {
  return (
    <span
      role="presentation"
      className={className ?? "h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-ink-50"}
    >
      <span className="block h-full rounded-full bg-primary-500" style={{ width: `${Math.min(Math.max(level, 5), 100)}%` }} />
    </span>
  );
}

export function Lock() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="mr-1 inline size-3.5 -translate-y-px" aria-label="Season Pass">
      <rect x="3" y="7" width="10" height="7" rx="1.5" fill="currentColor" opacity="0.85" />
      <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}
