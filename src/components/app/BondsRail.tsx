"use client";

import { useState } from "react";
import Link from "next/link";
import { GlowAvatar, ChapterBadge } from "@/components/app/BondChat";
import { useRespondToInvite } from "@/components/app/bonds/BondModals";
import { useIsOnline } from "@/components/app/Presence";
import { useToast } from "@/components/app/ToastProvider";
import { cancelConnectionRequest, connectWith, respondToRequest } from "@/lib/bond-actions";
import type { BondInvite, PendingRequest, Suggestion } from "@/lib/bonds";
import { cn } from "@/lib/cn";

/**
 * The Bonds rail — Figma frames 452:10158 and 1093:22073.
 *
 * YOUR BOND INVITES (Season Pass invites, each with its goal) sits on top.
 * PENDING CONNECTION carries Accept / Decline per request (circle requests and
 * bond invites alike); PEOPLE YOU MIGHT KNOW offers Connect. Each action raises
 * the matching alert from the section's set (253:14786, 285:9289, 285:9261).
 */
export function BondsRail({
  invites = [],
  pending,
  suggestions,
}: {
  invites?: BondInvite[];
  pending: PendingRequest[];
  suggestions: Suggestion[];
}) {
  return (
    <aside className="hidden w-[260px] shrink-0 scroll-slim overflow-y-auto bg-ivory-100 px-4 py-6 lg:block xl:w-[300px] xl:px-5">
      <div className="flex flex-col gap-7">
        {invites.length > 0 && (
          <section className="flex flex-col gap-4">
            <h2 className="font-sans text-base font-medium text-ink-600">
              YOUR BOND INVITES
            </h2>
            <ul className="flex flex-col gap-4">
              {invites.map((invite) => (
                <li key={invite.bondId} className="flex flex-col gap-3 rounded-lg bg-surface p-3">
                  <BondInviteCard invite={invite} />
                </li>
              ))}
            </ul>
          </section>
        )}

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
                  className="flex flex-col gap-3 rounded-lg bg-surface p-3"
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
                  className="flex flex-col gap-3 rounded-lg bg-surface p-3"
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
    const result = await respondToRequest(request.requestId, accept);
    setBusy(false);
    if (result.error) {
      toast({ title: result.error, tone: "danger" });
      return;
    }
    setHandled(accept ? "Accepted" : "Declined");
    toast(
      accept
        ? { title: "Connection request accepted" }
        : { title: "Connection request declined", tone: "danger" },
    );
  };

  return (
    <>
      <Person
        userId={request.userId}
        name={request.name}
        avatarUrl={request.avatarUrl}
        chapterSlug={request.chapterSlug}
        label={request.phase}
        linked
      />
      {request.message && <IntroNote message={request.message} prompt={request.prompt} />}
      <Link
        href={`/people/${request.userId}`}
        className="w-fit font-sans text-xs font-medium text-primary-600 underline-offset-2 hover:underline"
      >
        View profile
      </Link>
      {handled ? (
        <p className="font-sans text-sm text-ink-300">{handled}</p>
      ) : (
        <div className="flex gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => respond(true)}
            className="flex-1 rounded-full bg-primary-500 px-3 py-2 font-ui text-sm font-medium text-white transition-colors hover:bg-primary-400 disabled:opacity-60"
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

/** A Bond invite: who, their goal, Accept / Decline. Shared with the phone list. */
export function BondInviteCard({ invite }: { invite: BondInvite }) {
  const respond = useRespondToInvite();
  const [handled, setHandled] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const online = useIsOnline(invite.userId);

  const act = async (accept: boolean) => {
    setBusy(true);
    const ok = await respond(invite.bondId, accept, invite.name);
    setBusy(false);
    if (ok) setHandled(accept ? "Accepted" : "Declined");
  };

  return (
    <>
      <div className="flex min-w-0 items-center gap-3 border-b border-ink-50 pb-3">
        <GlowAvatar src={invite.avatarUrl} name={invite.name} online={online} />
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate font-sans text-sm font-medium text-ink-700">{invite.name}</span>
          {invite.goal && <span className="line-clamp-2 font-sans text-xs text-ink-400">Goal: {invite.goal}</span>}
        </span>
      </div>
      {handled ? (
        <p className="font-sans text-sm text-ink-300">{handled}</p>
      ) : (
        <div className="flex gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => act(true)}
            className="flex-1 rounded-full bg-primary-500 px-3 py-2 font-ui text-sm font-medium text-white transition-colors hover:bg-primary-400 disabled:opacity-60"
          >
            Accept
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => act(false)}
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
        disabled={status === "busy" || status === "connected"}
        onClick={async () => {
          // "Requested" takes the request back.
          if (status === "requested") {
            setStatus("busy");
            const result = await cancelConnectionRequest(person.userId);
            setStatus(result.error ? "requested" : "idle");
            toast(result.error ? { title: result.error, tone: "danger" } : { title: "Request cancelled" });
            return;
          }
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
        {status === "requested" ? "Requested · Cancel" : status === "connected" ? "Connected" : "Connect"}
      </button>
    </>
  );
}

/**
 * The note someone wrote with their introduction, quoted, with the starter
 * prompt they picked. Long notes fold to three lines with "Read more".
 */
export function IntroNote({ message, prompt }: { message: string; prompt: string | null }) {
  const [open, setOpen] = useState(false);
  // Roughly three lines at the rail's width; shorter notes need no toggle.
  const long = message.length > 140 || message.split("\n").length > 3;
  return (
    <div className="flex flex-col gap-1.5 rounded-lg bg-ivory-100 px-3 py-2.5">
      {prompt && <span className="font-sans text-xs font-medium text-primary-600">{prompt}</span>}
      <p
        className={cn("font-sans text-sm whitespace-pre-line break-words text-ink-500", !open && "line-clamp-3")}
      >
        &ldquo;{message}&rdquo;
      </p>
      {long && (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="w-fit font-sans text-xs font-medium text-ink-400 hover:text-ink-600"
        >
          {open ? "Show less" : "Read more"}
        </button>
      )}
    </div>
  );
}

function Person({
  userId,
  name,
  avatarUrl,
  chapterSlug,
  label,
  linked = false,
}: {
  userId: string;
  name: string;
  avatarUrl: string | null;
  chapterSlug: string | null;
  label: string | null;
  /** Avatar and name open their Grouv page. */
  linked?: boolean;
}) {
  const online = useIsOnline(userId);
  const avatar = <GlowAvatar src={avatarUrl} name={name} online={online} />;
  return (
    <div className="flex min-w-0 items-center gap-3">
      {linked ? (
        <Link href={`/people/${userId}`} aria-label={`View ${name}'s profile`} className="shrink-0 rounded-full">
          {avatar}
        </Link>
      ) : (
        avatar
      )}
      <span className="flex min-w-0 flex-col gap-1">
        {linked ? (
          <Link
            href={`/people/${userId}`}
            className="truncate font-sans text-sm font-medium text-ink-700 hover:underline"
          >
            {name}
          </Link>
        ) : (
          <span className="truncate font-sans text-sm font-medium text-ink-700">{name}</span>
        )}
        {label && <ChapterBadge chapterSlug={chapterSlug} label={label} />}
      </span>
    </div>
  );
}
