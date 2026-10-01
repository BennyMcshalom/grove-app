"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChapterBadge, GlowAvatar } from "@/components/app/BondChat";
import { DepthBar, Lock } from "@/components/app/bonds/BondBanner";
import { CheckinModal, EditGoalModal, EndBondModal } from "@/components/app/bonds/BondModals";
import { usePaywall } from "@/components/app/pass/PaywallProvider";
import { useIsOnline } from "@/components/app/Presence";
import { TopBar } from "@/components/app/TopBar";
import { useViewer } from "@/components/app/ViewerProvider";
import { Alert } from "@/components/app/Alert";
import { Button } from "@/components/ui/Button";
import {
  BOND_STAGE_LABEL,
  bondStage,
  goalSpan,
  type BondCheckin,
  type BondDetails,
  type BondStage,
} from "@/lib/bonds";
import { cn } from "@/lib/cn";

const longDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" });
const monthYear = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" });
const monthDay = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

/**
 * Bond Details — Figma 1228:29301 (Season Pass) and 1238:30546 (Free).
 *
 * Header with End Bond, then white cards: SHARED GOAL (Free: BOND DEPTH — a
 * bar with no number, PRD D8), CHECK-INS, MILESTONES (Pre → Mid → Post-
 * project) and BOND LOG (locked on Free). A released Bond reads the same,
 * without any way to add to it.
 */
export function BondDetailsView({ details, checkins }: { details: BondDetails; checkins: BondCheckin[] }) {
  const { hasPass } = useViewer();
  const paywall = usePaywall();
  const router = useRouter();
  const online = useIsOnline(details.userId);
  const [modal, setModal] = useState<"end" | "checkin" | "goal" | null>(null);
  const active = details.status === "active";
  const stage = bondStage(details);
  const caption = `Deepens automatically the more you and ${details.name} talk — check-ins and shared reflections speed it up.`;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <TopBar title="Bond Details" back="/bonds" />

      <div className="min-h-0 flex-1 scroll-slim overflow-y-auto bg-ivory-100 px-4 py-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-[1088px] flex-col gap-6 pb-10">
          <header className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <GlowAvatar src={details.avatarUrl} name={details.name} online={online} size={48} />
                <span className="flex min-w-0 flex-col gap-1">
                  <Link
                    href={`/people/${details.userId}`}
                    className="truncate font-sans text-lg font-medium text-ink-700 hover:underline"
                  >
                    {details.name}
                  </Link>
                  <span className="flex items-center gap-2">
                    {details.phase && <ChapterBadge chapterSlug={details.chapterSlug} label={details.phase} />}
                    <span className="rounded-full bg-primary-100 px-2 py-0.5 font-sans text-[10px] font-semibold text-primary-700 uppercase">
                      Bond
                    </span>
                  </span>
                </span>
              </div>
              {active && (
                <Button size="sm" onClick={() => setModal("end")}>
                  End Bond
                </Button>
              )}
            </div>
            <p className="font-sans text-xs text-ink-400" suppressHydrationWarning>
              Bond since {longDate.format(new Date(details.since))} · {BOND_STAGE_LABEL[stage]} ·{" "}
              {active ? "Active" : "Released"}
            </p>
          </header>

          {!active && (
            <Alert
              tone="info"
              title="This Bond was released"
              description={`${details.endedByMe ? "You ended it" : "It has ended"}. What you shared stays here, read-only — you and ${details.name} are still connected.`}
            />
          )}

          {hasPass ? (
            <Card label="Shared goal">
              <p className="font-sans text-base text-ink-700">
                {details.sharedGoal ?? "No shared goal yet — decide together what you’re working toward."}
              </p>
              <div className="flex items-center gap-4">
                <span className="shrink-0 font-sans text-sm text-ink-600">
                  {details.checkinCount} shared {details.checkinCount === 1 ? "check-in" : "check-ins"}
                </span>
                <DepthBar level={details.depthLevel} />
                <span className="shrink-0 font-sans text-sm text-ink-600">
                  {goalSpan(details.goalHorizonMonths, details.since)}
                </span>
              </div>
              <p className="font-sans text-xs text-ink-400">{caption}</p>
              {active && (
                <Button size="sm" variant="secondary" className="w-fit" onClick={() => setModal("goal")}>
                  {details.sharedGoal ? "Edit goal" : "Set a goal"}
                </Button>
              )}
            </Card>
          ) : (
            <Card label="Bond depth">
              {details.sharedGoal && <p className="font-sans text-base text-ink-700">{details.sharedGoal}</p>}
              <div className="flex items-center gap-4">
                <DepthBar level={details.depthLevel} />
                <span className="shrink-0 font-sans text-sm text-ink-600">
                  {goalSpan(details.goalHorizonMonths, details.since)}
                </span>
              </div>
              <p className="font-sans text-xs text-ink-400">{caption}</p>
            </Card>
          )}

          {(hasPass || checkins.length > 0) && (
            <Card
              label="Check-ins"
              action={
                active ? (
                  <Button size="sm" onClick={() => (hasPass ? setModal("checkin") : paywall("invite_bond"))}>
                    {!hasPass && <Lock />}
                    Add a check-in
                  </Button>
                ) : undefined
              }
            >
              {checkins.length === 0 ? (
                <p className="font-sans text-sm text-ink-300">
                  No check-ins yet. Log a moment with {details.name}, big or small.
                </p>
              ) : (
                <ul className="flex flex-col">
                  {checkins.map((checkin) => (
                    <li
                      key={checkin.id}
                      className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-ink-50 py-4 last:border-b-0"
                    >
                      <span className="w-12 shrink-0 font-sans text-xs text-ink-300">
                        {monthDay.format(new Date(`${checkin.happenedOn}T12:00:00Z`))}
                      </span>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-1 font-sans text-xs",
                          checkin.mode === "in_app" ? "bg-primary-50 text-primary-600" : "bg-ivory-200 text-ink-600",
                        )}
                      >
                        {checkin.mode === "in_app" ? "In the app" : "In person"}
                      </span>
                      <span className="min-w-0 flex-1 font-sans text-sm text-ink-700">
                        {checkin.fromMe ? "You" : details.name}: {checkin.body}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          <Card label="Milestones">
            <Milestones details={details} stage={stage} />
          </Card>

          {hasPass ? (
            <Card
              label={`Bond Log · ${details.logCount} shared ${details.logCount === 1 ? "entry" : "entries"}`}
              action={
                <Link
                  href={`/log/bonds/${details.bondId}`}
                  className="flex items-center gap-1 font-sans text-sm font-medium text-primary-600 hover:underline"
                >
                  View Bond Log <span aria-hidden="true">→</span>
                </Link>
              }
            />
          ) : (
            <Card
              label="Bond Log · Season Pass feature"
              muted
              action={
                <span className="flex flex-wrap items-center gap-4">
                  {details.logCount > 0 && (
                    <Link href={`/log/bonds/${details.bondId}`} className="font-sans text-sm text-ink-400 hover:underline">
                      Look back
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => paywall("bond_log")}
                    className="font-sans text-sm font-medium text-primary-600 hover:underline"
                  >
                    <Lock />
                    Unlock Bond Log
                  </button>
                </span>
              }
            />
          )}
        </div>
      </div>

      {modal === "end" && (
        <EndBondModal
          bondId={details.bondId}
          name={details.name}
          onClose={() => setModal(null)}
          onEnded={() => router.refresh()}
        />
      )}
      {modal === "checkin" && (
        <CheckinModal bondId={details.bondId} name={details.name} onClose={() => setModal(null)} />
      )}
      {modal === "goal" && (
        <EditGoalModal
          bondId={details.bondId}
          goal={details.sharedGoal}
          horizonMonths={details.goalHorizonMonths}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

function Card({
  label,
  action,
  muted = false,
  children,
}: {
  label: string;
  action?: React.ReactNode;
  muted?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl bg-surface p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          className={cn(
            "font-sans text-xs font-semibold uppercase",
            muted ? "text-ink-600" : "text-primary-600",
          )}
        >
          {label}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Pre-project → Mid-project → Post-project, the current one filled. */
function Milestones({ details, stage }: { details: BondDetails; stage: BondStage }) {
  const order: BondStage[] = ["pre", "mid", "post"];
  const current = order.indexOf(stage);
  const reachedOn: Record<BondStage, string | null> = {
    pre: details.since,
    mid: details.firstCheckinOn ? `${details.firstCheckinOn}T12:00:00Z` : null,
    post: details.releasedAt,
  };

  return (
    <ol className="flex flex-wrap items-center gap-3">
      {order.map((step, i) => {
        const past = i < current;
        const now = i === current;
        const when = reachedOn[step];
        return (
          <li key={step} className="flex items-center gap-3">
            {i > 0 && <Arrow faded={i > current} />}
            <span
              className={cn(
                "flex min-w-[112px] flex-col items-center rounded-lg px-4 py-2.5 text-center",
                now ? "bg-primary-600 text-white" : past ? "bg-primary-50 text-primary-300" : "bg-ivory-200 text-ink-500",
              )}
            >
              <span className="font-sans text-sm font-medium">{BOND_STAGE_LABEL[step]}</span>
              <span className="font-sans text-xs" suppressHydrationWarning>
                {now ? "Now" : past ? (when ? monthYear.format(new Date(when)) : "Done") : "Upcoming"}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function Arrow({ faded }: { faded: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn("size-5", faded ? "text-ink-100" : "text-primary-500")} aria-hidden="true">
      <path d="M4 12h15m0 0-6-6m6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
