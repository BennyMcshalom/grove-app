"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Avatar } from "@/components/app/Avatar";
import { IntroduceModal, type IntroTarget } from "@/components/app/home/IntroduceModal";
import { MatchPreferencesModal } from "@/components/app/home/MatchPreferencesModal";
import { useToast } from "@/components/app/ToastProvider";
import { Button } from "@/components/ui/Button";
import { ModalClose } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { getChapter } from "@/lib/chapters";
import { dismissMatch, loadMatches, notifyAboutMatches } from "@/lib/match-actions";
import type { Match } from "@/lib/matches";

/**
 * Potential connections — Figma 650:37394: a heading over the dimmed page and
 * a grid of match cards (two columns on desktop, one on the phone). Each card
 * says why you matched, and offers Introduce yourself, View Profile and Not
 * relevant (toast 1000:18969). With nobody close, "We couldn't find a close
 * match yet" (1119:24909, toast 1011:19237).
 */
export function MatchesModal({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [error, setError] = useState<string>();
  const [introducing, setIntroducing] = useState<IntroTarget | null>(null);
  const [preferences, setPreferences] = useState(false);
  const [notifying, startNotifying] = useTransition();

  const fetchMatches = useCallback(
    () =>
      loadMatches(4)
        .then((result) => {
          setMatches(result.matches);
          setError(result.error);
        })
        .catch(() => {
          setMatches([]);
          setError("We couldn't look for matches right now. Try again.");
        }),
    [],
  );

  /** "Try again", and after preferences change. */
  const load = () => {
    setError(undefined);
    setMatches(null);
    void fetchMatches();
  };

  useEffect(() => {
    void fetchMatches();
  }, [fetchMatches]);

  // The nested modals handle their own Escape; this one closes when it's on top.
  useEffect(() => {
    if (introducing || preferences) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [introducing, preferences, onClose]);

  const notRelevant = async (match: Match) => {
    setMatches((prev) => prev?.filter((m) => m.userId !== match.userId) ?? prev);
    const result = await dismissMatch(match.userId);
    if (result.error) {
      setMatches((prev) => (prev ? [match, ...prev] : prev));
      toast({ title: result.error, tone: "danger" });
      return;
    }
    toast({ title: "This profile won’t be shown to you again, thanks for helping us improve your matches." });
  };

  const notifyMe = () =>
    startNotifying(async () => {
      const result = await notifyAboutMatches();
      if (result.error) {
        toast({ title: result.error, tone: "danger" });
        return;
      }
      toast({ title: "You’re all set", description: "We’ll let you know when someone relevant is nearby." });
      onClose();
    });

  const empty = matches !== null && matches.length === 0;

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Potential connections"
        className="fixed inset-0 z-50 flex items-start justify-center scroll-slim overflow-y-auto bg-ink-900/60 p-4 sm:p-8"
        onClick={onClose}
      >
        <div className="relative my-auto flex w-full max-w-[800px] flex-col gap-8" onClick={(e) => e.stopPropagation()}>
          <ModalClose onClose={onClose} className="self-end bg-surface" />

          {empty && !error ? (
            <NoCloseMatch
              notifying={notifying}
              onBroaden={() => setPreferences(true)}
              onNotify={notifyMe}
            />
          ) : (
            <>
              <header className="flex flex-col items-center gap-2 text-center text-white">
                <h2 className="font-display text-2xl font-semibold lg:text-4xl">We found some potential connections</h2>
                <p className="font-sans text-base lg:text-lg">
                  We found a few people who may be a good fit for where you are right now.
                </p>
                <button
                  type="button"
                  onClick={() => setPreferences(true)}
                  className="rounded-full px-3 py-1.5 font-sans text-sm font-medium text-white underline-offset-4 hover:underline"
                >
                  Match preferences
                </button>
              </header>

              {error ? (
                <div className="flex flex-col items-center gap-4 rounded-2xl bg-surface p-8 text-center">
                  <p className="font-sans text-base text-ink-500">{error}</p>
                  <Button size="sm" onClick={load}>
                    Try again
                  </Button>
                </div>
              ) : (
                <ul className="grid gap-6 md:grid-cols-2">
                  {matches === null
                    ? [0, 1, 2, 3].map((i) => (
                        <li key={i} className="flex flex-col gap-3 rounded-2xl bg-surface p-4">
                          <Skeleton className="h-8 w-40" />
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-9 w-full rounded-full" />
                        </li>
                      ))
                    : matches.map((match) => (
                        <li key={match.userId}>
                          <MatchCard
                            match={match}
                            onIntroduce={() =>
                              setIntroducing({
                                userId: match.userId,
                                name: match.name,
                                chapterSlug: match.chapterSlug,
                                phase: match.phase,
                              })
                            }
                            onNotRelevant={() => void notRelevant(match)}
                          />
                        </li>
                      ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>

      {introducing && (
        <IntroduceModal
          person={introducing}
          onClose={() => setIntroducing(null)}
          onSent={() => setMatches((prev) => prev?.filter((m) => m.userId !== introducing.userId) ?? prev)}
        />
      )}
      {preferences && <MatchPreferencesModal onClose={() => setPreferences(false)} onSaved={load} />}
    </>
  );
}

function MatchCard({
  match,
  onIntroduce,
  onNotRelevant,
}: {
  match: Match;
  onIntroduce: () => void;
  onNotRelevant: () => void;
}) {
  const space = getChapter(match.chapterSlug)?.name ?? "";
  return (
    <article className="flex h-full gap-3 rounded-2xl bg-surface p-4">
      <Avatar src={match.avatarUrl} name={match.name} sizes="32px" className="size-8" />
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <h3 className="font-sans text-lg font-medium text-ink-800">{match.name}</h3>
        <span className="flex w-fit items-center gap-2 rounded-full bg-primary-50 px-3 py-1 font-sans text-xs font-medium text-primary-600">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-primary-500" />
          {space} · {match.phase}
        </span>
        {match.lookingFor && (
          <p className="font-sans text-sm text-ink-500">
            <span className="font-semibold">Looking for:</span> {match.lookingFor}
          </p>
        )}
        <p className="font-sans text-sm text-ink-500">
          <span className="font-semibold">Why you matched:</span> {match.why}
        </p>
        <div className="mt-auto flex flex-col gap-2 pt-2">
          <Button size="sm" fullWidth onClick={onIntroduce}>
            Introduce yourself
          </Button>
          <Button size="sm" variant="secondary" fullWidth href={`/people/${match.userId}`}>
            View Profile
          </Button>
          <Button size="sm" variant="tertiary" fullWidth onClick={onNotRelevant}>
            Not relevant
          </Button>
        </div>
      </div>
    </article>
  );
}

function NoCloseMatch({
  notifying,
  onBroaden,
  onNotify,
}: {
  notifying: boolean;
  onBroaden: () => void;
  onNotify: () => void;
}) {
  return (
    <div className="mx-auto flex w-full max-w-[660px] flex-col items-center gap-6 rounded-2xl bg-surface p-6 text-center sm:p-8">
      <SearchArt />
      <div className="flex flex-col gap-2">
        <h2 className="font-display text-2xl font-semibold text-ink-800 lg:text-3xl">We couldn’t find a close match yet</h2>
        <p className="font-sans text-base text-ink-400">
          We don’t have enough people who match your current preferences. You can broaden your preferences or let us
          notify you when someone becomes available.
        </p>
      </div>
      <div className="flex w-full flex-col gap-3 sm:flex-row">
        <Button size="md" fullWidth onClick={onBroaden}>
          Broaden your preferences
        </Button>
        <Button size="md" variant="secondary" fullWidth loading={notifying} onClick={onNotify}>
          Notify me when someone’s around
        </Button>
      </div>
    </div>
  );
}

/** The magnifier over a list — Figma's "no match" and search-empty art. */
export function SearchArt({ className = "h-[160px] w-[220px]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 180" className={className} fill="none" aria-hidden="true">
      <ellipse cx="96" cy="96" rx="56" ry="46" className="fill-primary-50" />
      <ellipse cx="150" cy="104" rx="44" ry="38" className="fill-primary-50" />
      <path d="M58 40h62l12 12v96H58z" className="fill-primary-100" />
      {[56, 92, 128].map((y) => (
        <g key={y}>
          <rect x="74" y={y - 12} width="84" height="24" rx="4" className="fill-surface stroke-ink-100" strokeWidth="1.5" />
          {[88, 102, 116].map((x) => (
            <circle key={x} cx={x} cy={y} r="4" className="fill-ink-100" />
          ))}
        </g>
      ))}
      <circle cx="158" cy="62" r="30" className="fill-surface stroke-ink-100" strokeWidth="2" />
      <path d="m180 84 22 22" className="stroke-ink-100" strokeWidth="8" strokeLinecap="round" />
      <path d="M84 20h8M88 16v8M190 132h8M194 128v8" className="stroke-primary-400" strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="120" cy="166" rx="54" ry="4" className="fill-primary-50" />
    </svg>
  );
}
