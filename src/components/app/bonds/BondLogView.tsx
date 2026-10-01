"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Alert } from "@/components/app/Alert";
import { ChapterBadge, GlowAvatar } from "@/components/app/BondChat";
import { Lock } from "@/components/app/bonds/BondBanner";
import { FIELD_LABEL, WELL } from "@/components/app/bonds/BondModals";
import { usePaywall } from "@/components/app/pass/PaywallProvider";
import { ConfirmBar } from "@/components/app/PersonView";
import { useIsOnline } from "@/components/app/Presence";
import { useToast } from "@/components/app/ToastProvider";
import { TopBar } from "@/components/app/TopBar";
import { useViewer } from "@/components/app/ViewerProvider";
import { FormError } from "@/components/auth/FormError";
import { Button } from "@/components/ui/Button";
import { Modal, ModalHeader } from "@/components/ui/Modal";
import { endBondActivity, saveBondResponse, startBondActivity } from "@/lib/bond-actions";
import { BOND_ACTIVITIES, type BondDetails, type BondLogRound } from "@/lib/bonds";
import { cn } from "@/lib/cn";

type Kind = BondLogRound["kind"];

const shortDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const ACTIVITY_LABEL: Record<Kind, string> = {
  weekly: "Weekly check-in",
  gratitude: "5-day gratitude challenge",
  something_new: "Try something new together",
};

/**
 * "Your shared log with Jalen" — Figma 1185:21160 / 1303:22270, released
 * 1303:22885.
 *
 * Each running activity is a group of prompt cards: YOU on the left (Share my
 * response, your Draft, or "You skipped this one"), them on the right once
 * they've shared. The weekly prompt is newest first; the gratitude week runs
 * Day 1 → 5 and ends with its "complete" card. Season Pass to write; on Free,
 * or once the Bond is released, everything reads back but nothing is added.
 */
export function BondLogView({ details, rounds }: { details: BondDetails; rounds: BondLogRound[] }) {
  const { hasPass } = useViewer();
  const paywall = usePaywall();
  const online = useIsOnline(details.userId);
  const [answering, setAnswering] = useState<BondLogRound | null>(null);
  const [starting, setStarting] = useState(false);
  const active = details.status === "active";
  const writable = active && hasPass;

  const groups = groupByActivity(rounds);
  const liveKinds = new Set(groups.filter((g) => !g.ended).map((g) => g.kind));
  const reflections = rounds.filter((r) => r.mine?.shared && r.theirShared).length;

  const answer = (round: BondLogRound) => (hasPass ? setAnswering(round) : paywall("bond_log"));

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar title={`Your shared log with ${details.name}`} back="/log" />

        <div className="min-h-0 flex-1 scroll-slim overflow-y-auto px-4 py-6 lg:px-8">
          <div className="mx-auto flex w-full max-w-[708px] flex-col gap-6 pb-10">
            {!active && (
              <Alert
                tone="info"
                title="This Bond was released"
                description="The log is now read-only — you can still look back, but nothing new can be added."
              />
            )}
            {active && !hasPass && (
              <p className="rounded-2xl bg-surface px-4 py-3 font-sans text-sm text-ink-500">
                The Bond Log is a Season Pass feature — what you’ve shared stays readable.{" "}
                <button
                  type="button"
                  onClick={() => paywall("bond_log")}
                  className="font-medium text-primary-600 hover:underline"
                >
                  <Lock />
                  Unlock Bond Log
                </button>
              </p>
            )}

            {groups.length === 0 ? (
              <p className="rounded-3xl bg-surface px-4 py-6 text-center font-sans text-sm text-ink-300">
                Nothing in your shared log yet.
              </p>
            ) : (
              groups.map((group) => (
                <ActivityGroup
                  key={group.activityId}
                  group={group}
                  name={details.name}
                  writable={writable && !group.ended}
                  onAnswer={answer}
                />
              ))
            )}

            {active && (
              <button
                type="button"
                onClick={() => (hasPass ? setStarting(true) : paywall("bond_log"))}
                className="flex w-fit items-center gap-2 font-sans text-sm font-medium text-primary-600 hover:underline"
              >
                {hasPass ? <PlusIcon /> : <Lock />}
                Start a challenge or activity
              </button>
            )}
          </div>
        </div>
      </div>

      <aside className="hidden w-[300px] shrink-0 scroll-slim overflow-y-auto bg-ivory-100 px-6 py-6 rail:block wide:w-[396px] wide:px-8">
        <section className="flex flex-col gap-3">
          <h2 className="font-sans text-base font-medium text-ink-600">SHARED LOG</h2>
          <div className="flex items-center gap-3 rounded-lg bg-ivory-200 p-4">
            <GlowAvatar src={details.avatarUrl} name={details.name} online={online} size={48} />
            <span className="flex min-w-0 flex-col gap-1">
              <span className="truncate font-sans text-base font-medium text-ink-700">{details.name}</span>
              {details.phase && <ChapterBadge chapterSlug={details.chapterSlug} label={details.phase} />}
              <span className="font-sans text-sm text-primary-600">
                {reflections} shared {reflections === 1 ? "reflection" : "reflections"}
              </span>
            </span>
          </div>
        </section>
      </aside>

      {answering && (
        <PromptModal round={answering} name={details.name} onClose={() => setAnswering(null)} />
      )}
      {starting && (
        <StartActivityModal
          bondId={details.bondId}
          running={liveKinds}
          onClose={() => setStarting(false)}
        />
      )}
    </div>
  );
}

type Group = {
  activityId: string;
  kind: Kind;
  ended: boolean;
  rounds: BondLogRound[];
};

function groupByActivity(rounds: BondLogRound[]): Group[] {
  const groups: Group[] = [];
  for (const round of rounds) {
    const last = groups.find((g) => g.activityId === round.activityId);
    if (last) last.rounds.push(round);
    else groups.push({ activityId: round.activityId, kind: round.kind, ended: round.activityEnded, rounds: [round] });
  }
  // The weekly prompt reads newest first; a challenge reads Day 1 → 5.
  for (const g of groups) g.rounds.sort((a, b) => (g.kind === "weekly" ? b.round - a.round : a.round - b.round));
  return groups;
}

function ActivityGroup({
  group,
  name,
  writable,
  onAnswer,
}: {
  group: Group;
  name: string;
  writable: boolean;
  onAnswer: (round: BondLogRound) => void;
}) {
  const toast = useToast();
  const [menu, setMenu] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, start] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);
  const latest = Math.max(...group.rounds.map((r) => r.round));
  const complete = group.kind === "gratitude" && group.rounds.length === 5 && group.rounds.every((r) => r.mine?.shared && r.theirShared);

  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menu]);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-sans text-sm font-medium text-ink-500">
          {ACTIVITY_LABEL[group.kind]}
          {group.ended ? " · Ended" : group.kind === "gratitude" ? ` · Day ${Math.min(latest, 5)} of 5` : ""}
        </h2>
        {writable && (
          <div ref={menuRef} className="relative">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={menu}
              aria-label={`${ACTIVITY_LABEL[group.kind]} options`}
              onClick={() => setMenu((v) => !v)}
              className="rounded p-1 text-ink-400 transition-colors hover:bg-ivory-200"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="size-4" aria-hidden="true">
                <circle cx="10" cy="4" r="1.5" />
                <circle cx="10" cy="10" r="1.5" />
                <circle cx="10" cy="16" r="1.5" />
              </svg>
            </button>
            {menu && (
              <ul
                role="menu"
                className="absolute top-full right-0 z-30 mt-2 w-48 rounded-xl bg-surface p-1.5 shadow-[0px_8px_24px_0px_rgba(0,0,0,0.12)]"
              >
                <li role="none">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenu(false);
                      setConfirming(true);
                    }}
                    className="w-full rounded-lg px-3 py-2.5 text-left font-sans text-sm text-destructive-60 hover:bg-ivory-100"
                  >
                    End Challenge
                  </button>
                </li>
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Figma 1303:22514. */}
      {confirming && (
        <ConfirmBar
          message={`Are you sure you want to end this ${group.kind === "weekly" ? "weekly check-in" : "challenge"}? You’ll stay connected as normal${group.kind === "weekly" ? ", there just won’t be a new weekly prompt for this Bond" : ""}. Nothing you’ve already shared is deleted.`}
          action="End Challenge"
          busy={busy}
          onCancel={() => setConfirming(false)}
          onConfirm={() =>
            start(async () => {
              const result = await endBondActivity(group.activityId);
              if (result.error) return void toast({ title: result.error, tone: "danger" });
              setConfirming(false);
              toast({ title: "Challenge Ended", description: "You’ll stay connected as normal" });
            })
          }
        />
      )}

      {group.rounds.map((round) => (
        <RoundCard
          key={round.round}
          round={round}
          name={name}
          canAnswer={writable && (group.kind !== "weekly" || round.round === latest)}
          onAnswer={() => onAnswer(round)}
        />
      ))}

      {complete && (
        <div className="flex items-center gap-4 rounded-2xl border border-ink-50 bg-surface px-5 py-4">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary-600 text-white">
            <svg viewBox="0 0 16 16" fill="none" className="size-4" aria-hidden="true">
              <path d="m3.5 8.5 3 3 6-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="flex flex-col">
            <span className="font-sans text-sm font-semibold text-ink-700">5-day gratitude challenge — complete</span>
            <span className="font-sans text-xs text-ink-400">All 5 days shared with {name}. Nice work.</span>
          </span>
        </div>
      )}
    </section>
  );
}

function RoundCard({
  round,
  name,
  canAnswer,
  onAnswer,
}: {
  round: BondLogRound;
  name: string;
  canAnswer: boolean;
  onAnswer: () => void;
}) {
  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-ink-50 bg-surface p-6">
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          {round.kind === "gratitude" && <span className="font-sans text-sm text-ink-400">Day {round.round}</span>}
          <h3 className="font-sans text-base font-medium text-ink-800">{round.title}</h3>
          {round.kind !== "gratitude" && round.subtitle && (
            <p className="font-sans text-sm text-ink-400">{round.subtitle}</p>
          )}
        </div>
        <span className="shrink-0 font-sans text-xs text-ink-300">
          {shortDate.format(new Date(`${round.opensOn}T12:00:00Z`))}
        </span>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex min-h-20 flex-col gap-2 rounded-lg bg-ivory-100 p-3">
          <span className="flex items-center justify-between gap-2">
            <span className="font-sans text-xs text-primary-600 uppercase">You</span>
            {round.mine && !round.mine.shared && (
              <span className="rounded-full bg-primary-50 px-2 py-0.5 font-sans text-xs text-primary-600">Draft</span>
            )}
          </span>
          {round.mine ? (
            canAnswer && !round.mine.shared ? (
              <button type="button" onClick={onAnswer} className="text-left font-sans text-sm text-ink-700 hover:underline">
                {round.mine.body}
              </button>
            ) : (
              <p className="font-sans text-sm whitespace-pre-line text-ink-700">{round.mine.body}</p>
            )
          ) : canAnswer ? (
            <button
              type="button"
              onClick={onAnswer}
              className="m-auto flex items-center gap-2 font-sans text-sm font-medium text-primary-600 hover:underline"
            >
              <PlusIcon />
              Share my response
            </button>
          ) : (
            <p className="font-sans text-sm text-ink-300">You skipped this one, that’s okay — not every prompt fits.</p>
          )}
        </div>

        <div className="flex min-h-20 flex-col gap-2 rounded-lg bg-ivory-100 p-3">
          <span className="font-sans text-xs text-primary-600 uppercase">{name}</span>
          {round.theirs ? (
            <p className="font-sans text-sm whitespace-pre-line text-ink-700">{round.theirs.body}</p>
          ) : (
            <p className="font-sans text-sm text-ink-300">Waiting for {name} to respond…</p>
          )}
        </div>
      </div>
    </article>
  );
}

/**
 * This week's prompt — Figma 1285:21875 (new) / 1286:21985 (editing a saved
 * draft); the gratitude day is 1301:22416. Private until Share response.
 */
function PromptModal({ round, name, onClose }: { round: BondLogRound; name: string; onClose: () => void }) {
  const toast = useToast();
  const draft = round.mine && !round.mine.shared ? round.mine.body : null;
  const [body, setBody] = useState(draft ?? "");
  const [error, setError] = useState<string>();
  const [busy, start] = useTransition();

  const heading =
    round.kind === "gratitude"
      ? `Day ${round.round} of 5 — Gratitude challenge`
      : round.kind === "weekly"
        ? "This week’s prompt"
        : "Try something new together";
  const intro =
    round.kind === "gratitude"
      ? `Share one thing you’re grateful for today. ${name} will see it once you choose to share.`
      : `${round.subtitle ?? "A prompt for the two of you."} ${name} will see your answer once you share it.`;

  const save = (share: boolean) =>
    start(async () => {
      const result = await saveBondResponse(round.activityId, round.round, body, share);
      if (result.error) return setError(result.error);
      onClose();
      if (!share) {
        toast(
          draft
            ? { title: "Draft updated", description: `Still just for you — ${name} won’t see this until you share it.` }
            : { title: "Draft Saved", description: "We’ll keep this here until you’re ready to share it" },
        );
      } else if (round.kind === "gratitude") {
        const left = 5 - round.round;
        toast({
          title: `Gratitude shared — Day ${round.round} of 5`,
          description: `${name} can now see today’s reflection.${left > 0 ? ` ${left} ${left === 1 ? "day" : "days"} to go.` : ""}`,
        });
      } else {
        toast({
          title: "Response shared",
          description: `${name} can now see what you wrote. You’ll be notified when they share theirs.`,
        });
      }
    });

  return (
    <Modal label={heading} onClose={onClose}>
      <div className="flex flex-col gap-3">
        {draft && (
          <span className="w-fit rounded-full bg-primary-50 px-3 py-1 font-sans text-xs text-primary-600">Saved Draft</span>
        )}
        <ModalHeader title={heading} onClose={onClose} />
      </div>
      <p className="font-sans text-base text-ink-500">{intro}</p>
      <label className="flex flex-col gap-2">
        <span className={FIELD_LABEL}>{round.title}</span>
        <textarea
          autoFocus
          rows={4}
          maxLength={2000}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={round.kind === "gratitude" ? "e.g. Grateful for a slow morning with coffee on the porch" : "One honest line"}
          className={WELL}
        />
      </label>
      <span className="font-sans text-sm text-ink-400">Only you can see this until you choose to share it.</span>
      <FormError message={error} />
      <div className="flex gap-3 border-t border-ink-50 pt-6">
        <Button size="sm" fullWidth disabled={busy || !body.trim()} onClick={() => save(true)}>
          Share response
        </Button>
        <Button size="sm" variant="secondary" fullWidth disabled={busy || !body.trim()} onClick={() => save(false)}>
          {draft ? "Update draft" : "Save as draft"}
        </Button>
      </div>
    </Modal>
  );
}

/** "Start a challenge or activity" — Figma 1189:21296. */
function StartActivityModal({
  bondId,
  running,
  onClose,
}: {
  bondId: string;
  running: Set<Kind>;
  onClose: () => void;
}) {
  const toast = useToast();
  const paywall = usePaywall();
  const [choice, setChoice] = useState<Kind | null>(null);
  const [error, setError] = useState<string>();
  const [busy, start] = useTransition();

  return (
    <Modal label="Start a challenge or activity" onClose={onClose}>
      <ModalHeader title="Start a challenge or activity" onClose={onClose} />
      <ul role="radiogroup" className="flex flex-col gap-4">
        {BOND_ACTIVITIES.map((activity) => {
          const taken = running.has(activity.kind) && activity.kind !== "gratitude";
          const on = choice === activity.kind;
          return (
            <li key={activity.kind}>
              <button
                type="button"
                role="radio"
                aria-checked={on}
                disabled={taken}
                onClick={() => setChoice(activity.kind)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-lg border p-4 text-left transition-colors disabled:opacity-50",
                  on ? "border-primary-500 bg-primary-50" : "border-ink-50 hover:bg-ivory-100",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 grid size-4 shrink-0 place-items-center rounded border",
                    on ? "border-primary-600 bg-primary-600 text-white" : "border-ink-100",
                  )}
                  aria-hidden="true"
                >
                  {on && (
                    <svg viewBox="0 0 16 16" fill="none" className="size-3">
                      <path d="m3.5 8.5 3 3 6-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  )}
                </span>
                <span className="flex flex-col gap-1">
                  <span className="font-sans text-base text-ink-800">{activity.label}</span>
                  <span className="font-sans text-sm text-ink-400">{taken ? "Already running" : activity.body}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <FormError message={error} />
      <Button
        size="sm"
        fullWidth
        loading={busy}
        disabled={busy || !choice}
        onClick={() =>
          choice &&
          start(async () => {
            const result = await startBondActivity(bondId, choice);
            if (result.locked) {
              onClose();
              return paywall("bond_log");
            }
            if (result.error) return setError(result.error);
            onClose();
            toast({
              title: "Challenge started",
              description:
                choice === "gratitude"
                  ? "5-day gratitude challenge is on — Day 1 of 5."
                  : `${BOND_ACTIVITIES.find((a) => a.kind === choice)?.label} is on.`,
            });
          })
        }
      >
        Start challenge
      </Button>
    </Modal>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="size-4" aria-hidden="true">
      <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
