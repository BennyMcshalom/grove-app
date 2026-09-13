"use client";

import { useState } from "react";
import { GlowAvatar, ChapterBadge } from "@/components/app/BondChat";
import { useIsOnline } from "@/components/app/Presence";
import { useToast } from "@/components/app/ToastProvider";
import { connectWith, respondToRequest } from "@/lib/bond-actions";
import type { PendingRequest, Suggestion } from "@/lib/bonds";

/**
 * The Bonds rail — Figma frame 452:10158.
 *
 * PENDING CONNECTION carries Accept / Decline per request (circle requests and
 * bond invites alike); PEOPLE YOU MIGHT KNOW offers Connect. Each action raises
 * the matching alert from the section's set (253:14786, 285:9289, 285:9261).
 */
export function BondsRail({
  pending,
  suggestions,
}: {
  pending: PendingRequest[];
  suggestions: Suggestion[];
}) {
  return (
    <aside className="hidden w-[260px] shrink-0 scroll-slim overflow-y-auto bg-ivory-100 px-4 py-6 lg:block xl:w-[300px] xl:px-5">
      <div className="flex flex-col gap-7">
        <section className="flex flex-col gap-4">
          <h2 className="font-sans text-base font-medium text-ink-600">
            PENDING CONNECTION
          </h2>
          {pending.length === 0 ? (
            <p className="font-sans text-sm text-ink-300">Nothing waiting on you.</p>
          ) : (
            <ul className="flex flex-col gap-4">
              {pending.map((request) => (
                <li
                  key={request.requestId}
                  className="flex flex-col gap-3 rounded-lg bg-white p-3"
                >
                  <PendingCard request={request} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <span className="h-px w-full bg-ink-50" />

        <section className="flex flex-col gap-4">
          <h2 className="font-sans text-base font-medium text-ink-600">
            PEOPLE YOU MIGHT KNOW
          </h2>
          {suggestions.length === 0 ? (
            <p className="font-sans text-sm text-ink-300">
              New faces show up here as your spaces fill up.
            </p>
          ) : (
            <ul className="flex flex-col gap-4">
              {suggestions.map((person) => (
                <li
                  key={person.userId}
                  className="flex flex-col gap-3 rounded-lg bg-white p-3"
                >
                  <SuggestionCard person={person} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </aside>
  );
}

/** Accept / Decline for one request. Shared with the phone list. */
export function PendingCard({ request }: { request: PendingRequest }) {
  const toast = useToast();
  const [handled, setHandled] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const respond = async (accept: boolean) => {
    setBusy(true);
    const result = await respondToRequest(request.kind, request.requestId, accept);
    setBusy(false);
    if (result.error) {
      toast({ title: result.error, tone: "danger" });
      return;
    }
    setHandled(accept ? "Accepted" : "Declined");
    const what = request.kind === "bond" ? "Bond invitation" : "Connection request";
    toast(
      accept
        ? { title: `${what} accepted` }
        : { title: `${what} declined`, tone: "danger" },
    );
  };

  return (
    <>
      <Person
        userId={request.userId}
        name={request.name}
        avatarUrl={request.avatarUrl}
        chapterSlug={request.chapterSlug}
        label={request.kind === "bond" ? "Wants to bond" : request.phase}
      />
      {handled ? (
        <p className="font-sans text-sm text-ink-300">{handled}</p>
      ) : (
        <div className="flex gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => respond(true)}
            className="flex-1 rounded-full bg-primary-500 px-3 py-2 font-ui text-sm font-medium text-ink-0 transition-colors hover:bg-primary-400 disabled:opacity-60"
          >
            Accept
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => respond(false)}
            className="flex-1 rounded-full bg-primary-50 px-3 py-2 font-ui text-sm font-medium text-primary-800 transition-colors hover:bg-primary-100 disabled:opacity-60"
          >
            Decline
          </button>
        </div>
      )}
    </>
  );
}

/** Connect for one suggestion. Shared with the phone list. */
export function SuggestionCard({ person }: { person: Suggestion }) {
  const toast = useToast();
  const [status, setStatus] = useState<"idle" | "busy" | "requested" | "connected">("idle");

  return (
    <>
      <Person
        userId={person.userId}
        name={person.name}
        avatarUrl={person.avatarUrl}
        chapterSlug={person.sharedChapter}
        label={person.phase}
      />
      {person.mutualCount > 0 && (
        <span className="font-sans text-xs text-ink-400">
          {person.mutualCount === 1
            ? `1 person in your circle knows ${person.name}`
            : `${person.mutualCount} people in your circle know ${person.name}`}
        </span>
      )}
      <button
        type="button"
        disabled={status !== "idle"}
        onClick={async () => {
          setStatus("busy");
          const result = await connectWith(person.userId);
          if (result.error) {
            setStatus("idle");
            toast({ title: result.error, tone: "danger" });
            return;
          }
          const connected = result.status === "accepted";
          setStatus(connected ? "connected" : "requested");
          toast({ title: connected ? "You're connected" : "Connection request sent" });
        }}
        className="w-full rounded-full border border-primary-500 px-3 py-2 font-ui text-sm font-medium text-primary-600 transition-colors hover:bg-primary-50 disabled:border-ink-50 disabled:text-ink-300"
      >
        {status === "requested" ? "Requested" : status === "connected" ? "Connected" : "Connect"}
      </button>
    </>
  );
}

function Person({
  userId,
  name,
  avatarUrl,
  chapterSlug,
  label,
}: {
  userId: string;
  name: string;
  avatarUrl: string | null;
  chapterSlug: string | null;
  label: string | null;
}) {
  const online = useIsOnline(userId);
  return (
    <div className="flex items-center gap-3">
      <GlowAvatar src={avatarUrl} name={name} online={online} />
      <span className="flex min-w-0 flex-col gap-1">
        <span className="truncate font-sans text-sm font-medium text-ink-700">
          {name}
        </span>
        {label && <ChapterBadge chapterSlug={chapterSlug} label={label} />}
      </span>
    </div>
  );
}
