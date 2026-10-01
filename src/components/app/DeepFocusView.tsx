"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/app/TopBar";
import { SearchArt } from "@/components/app/SearchArt";
import { FormError } from "@/components/auth/FormError";
import { Button } from "@/components/ui/Button";
import { ArrowRight } from "@/components/ui/ArrowRight";
import { Modal } from "@/components/ui/Modal";
import { beginDeepFocus, endDeepFocus, finishFocusReturn } from "@/app/(app)/deep-focus/actions";
import { cn } from "@/lib/cn";
import { FOCUS_DURATIONS, focusEndsAt, type FocusDuration } from "@/lib/profile";

/** "While you were away" counts from focus_digest(). Never message text. */
export interface FocusDigest {
  newMatches: number;
  bondMessages: number;
  bondSender: string | null;
  otherMessages: number;
  otherSender: string | null;
  groupReplies: number;
  groupTitle: string | null;
  postComments: number;
}

/**
 * Deep Focus — Figma frame 296:11390 (phone 643:30126) and the cross frames
 * 1207:22853 (Active, locked), 1207:22861 (Return) and 1207:22896 (Optional
 * digest).
 *
 * Choosing: a single centred column with the clock badge, the pitch, four
 * duration options and the two actions. The phone frame titles its header
 * "Archive", which reads as a copy-paste slip, so it carries this page's name.
 *
 * Active and Return cover the whole app, rail and nav included, as Figma
 * draws them: Grouv is locked, then welcomes you back with an optional, calm
 * digest (PRD §12: "without urgency badges").
 */
export function DeepFocusView({
  activeUntil,
  returning = false,
  digest = null,
}: {
  activeUntil: string | null;
  returning?: boolean;
  digest?: FocusDigest | null;
}) {
  if (activeUntil) return <LockedScreen until={activeUntil} />;
  if (returning) return <ReturnScreen digest={digest} />;
  return <ChooseDuration />;
}

function ChooseDuration() {
  const [chosen, setChosen] = useState<FocusDuration | null>(null);
  const [error, setError] = useState<string>();
  const [starting, startStarting] = useTransition();

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <TopBar title="Deep Focus" back="/settings" phoneOnly />

      <div className="min-h-0 flex-1 scroll-slim overflow-y-auto px-4 py-10 lg:px-8">
        <div className="mx-auto flex w-full max-w-[560px] flex-col gap-6 lg:gap-8">
          <header className="flex flex-col items-center gap-2 text-center">
            <span className="grid size-11 place-items-center rounded-full bg-primary-100 text-primary-500">
              <ClockIcon />
            </span>
            <h1 className="font-display text-xl leading-[1.04] font-semibold text-ink-800 sm:text-2xl lg:text-3xl">
              Go into Deep Focus
            </h1>
            <p className="max-w-[505px] font-sans text-sm text-ink-400">
              Grouv locks until you choose to return. No counter waiting for you when you come back.
            </p>
          </header>

          <ul className="flex flex-col gap-3">
            {FOCUS_DURATIONS.map((option) => {
              const isOn = chosen === option.value;
              return (
                <li key={option.value}>
                  <button
                    type="button"
                    onClick={() => setChosen(isOn ? null : option.value)}
                    aria-pressed={isOn}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-2xl border bg-surface p-3.5 text-left transition-colors lg:p-4",
                      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600",
                      isOn ? "border-primary-500 bg-primary-50" : "border-ink-50 hover:border-ivory-600",
                    )}
                  >
                    <span className="font-sans text-sm font-medium text-ink-700 lg:text-base">{option.label}</span>
                    <span
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded-md border",
                        isOn ? "border-primary-500 bg-primary-500 text-white" : "border-transparent bg-ivory-100",
                      )}
                      aria-hidden="true"
                    >
                      {isOn && (
                        <svg viewBox="0 0 16 16" fill="none" className="size-3.5">
                          <path
                            d="m3.5 8.5 3 3 6-6"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="flex flex-col items-center gap-4">
            <FormError message={error} />
            <Button
              size="md"
              fullWidth
              iconRight={<ArrowRight />}
              disabled={!chosen}
              loading={starting}
              onClick={() => {
                if (!chosen) return;
                setError(undefined);
                startStarting(async () => {
                  const result = await beginDeepFocus(chosen, focusEndsAt(chosen).toISOString());
                  if (result.error) setError(result.error);
                });
              }}
            >
              Begin Deep Focus
            </Button>
            <Button variant="tertiary" size="md" href="/home">
              Not now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Cross 1207:22853 — "You're in Deep Focus". A dark screen over everything,
 * the same in both themes. "Return early" asks first (PRD §12), then ends
 * the session and shows the welcome back.
 */
function LockedScreen({ until }: { until: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [returning, startReturning] = useTransition();

  // When the chosen time runs out, the page re-reads and welcomes them back.
  useEffect(() => {
    const ms = Date.parse(until) - Date.now();
    if (ms > 2 ** 31 - 1) return;
    const timer = setTimeout(() => router.refresh(), Math.max(ms, 0) + 1000);
    return () => clearTimeout(timer);
  }, [until, router]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-neutral-900 px-4 py-10">
      <div className="flex w-full max-w-[440px] flex-col items-center gap-8 text-center">
        <div className="flex flex-col gap-3">
          <h1 className="font-display text-2xl font-semibold text-white lg:text-3xl">You&rsquo;re in Deep Focus</h1>
          <p className="font-sans text-sm text-white/70 lg:text-base">
            Grouv is locked until you choose to return. Until{" "}
            <time dateTime={until} suppressHydrationWarning>
              {new Date(until).toLocaleString(undefined, { weekday: "long", hour: "numeric", minute: "2-digit" })}
            </time>
            .
          </p>
        </div>
        <div className="flex w-full flex-col items-center gap-4">
          <Button size="sm" className="w-[240px]" onClick={() => setConfirming(true)}>
            Return early
          </Button>
          <p className="max-w-[360px] font-sans text-xs text-white/55">
            Returning early ends Deep Focus right away — you won&rsquo;t lose anything.
          </p>
        </div>
      </div>

      {confirming && (
        <Modal label="Return early?" onClose={() => setConfirming(false)} width="max-w-[480px]" className="gap-4">
          <div className="flex flex-col gap-2">
            <h2 className="font-display text-xl font-semibold text-ink-800">Return early?</h2>
            <p className="font-sans text-sm text-ink-300">
              This ends Deep Focus now. Everything is exactly where you left it, and you can start
              another session whenever you like.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Button
              size="sm"
              fullWidth
              loading={returning}
              onClick={() => startReturning(() => endDeepFocus())}
            >
              End Deep Focus
            </Button>
            <Button variant="tertiary" size="sm" fullWidth onClick={() => setConfirming(false)}>
              Stay in Deep Focus
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/** Cross 1207:22861 "Welcome back", then 1207:22896 "While you were away". */
function ReturnScreen({ digest }: { digest: FocusDigest | null }) {
  const [showDigest, setShowDigest] = useState(false);
  const [leaving, startLeaving] = useTransition();
  const leave = () => startLeaving(() => finishFocusReturn());

  const items = digest ? digestItems(digest) : [];

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-ivory-100 px-4 py-10">
      {showDigest ? (
        <div className="mx-auto flex w-full max-w-[560px] flex-col gap-6 lg:pt-10">
          <header className="flex flex-col gap-1">
            <h1 className="font-display text-xl font-semibold text-ink-800 lg:text-2xl">While you were away</h1>
            <p className="font-sans text-sm text-ink-300">
              A quick, calm catch-up — no red badges, no pressure to respond to everything at once.
            </p>
          </header>
          <ul className="flex flex-col gap-3">
            {items.length === 0 ? (
              <li className="rounded-lg border border-ink-50 bg-surface px-4 py-3">
                <p className="font-sans text-sm font-semibold text-ink-600">All quiet</p>
                <p className="font-sans text-xs text-ink-300">Nothing needs you. Your chapters kept their place.</p>
              </li>
            ) : (
              items.map((item) => (
                <li key={item.title} className="rounded-lg border border-ink-50 bg-surface px-4 py-3">
                  <p className="font-sans text-sm font-semibold text-ink-600">{item.title}</p>
                  <p className="font-sans text-xs text-ink-300">{item.body}</p>
                </li>
              ))
            )}
          </ul>
          <div>
            <Button size="sm" loading={leaving} onClick={leave}>
              I&rsquo;m ready — take me in
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex min-h-full items-center justify-center">
          <div className="flex w-full max-w-[440px] flex-col items-center gap-6 text-center">
            <SearchArt />
            <div className="flex flex-col gap-2">
              <h1 className="font-display text-xl font-semibold text-ink-800 lg:text-2xl">Welcome back</h1>
              <p className="font-sans text-sm text-ink-300">
                Deep Focus has ended. Take a breath before you dive back in — everything&rsquo;s exactly
                where you left it.
              </p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Button size="sm" className="w-[240px]" onClick={() => setShowDigest(true)}>
                See what you missed
              </Button>
              <Button variant="tertiary" size="sm" loading={leaving} onClick={leave}>
                Skip for now
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

/** Only what happened, in Figma's calm voice; empty kinds are left out. */
function digestItems(d: FocusDigest) {
  const items: { title: string; body: string }[] = [];
  if (d.newMatches > 0) {
    items.push({ title: plural(d.newMatches, "new match", "new matches"), body: "Your chapter kept working while you were gone." });
  }
  if (d.bondMessages > 0) {
    items.push({
      title: plural(d.bondMessages, "Bond message"),
      body: `${d.bondSender ?? "A Bond"} sent a message — no rush to reply.`,
    });
  }
  if (d.otherMessages > 0) {
    items.push({
      title: plural(d.otherMessages, "message"),
      body: `${d.otherSender ?? "Someone in your circle"} reached out — whenever you're ready.`,
    });
  }
  if (d.groupReplies > 0) {
    items.push({
      title: plural(d.groupReplies, "chapter group reply", "chapter group replies"),
      body: d.groupTitle ? `Someone responded in ${d.groupTitle}.` : "Someone responded in your groups.",
    });
  }
  if (d.postComments > 0) {
    items.push({ title: plural(d.postComments, "comment"), body: "People responded to what you shared." });
  }
  return items;
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" className="size-6" aria-hidden="true">
      <circle cx="16" cy="16" r="11" stroke="currentColor" strokeWidth="2" />
      <path d="M16 9.5V16l4.5 2.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
