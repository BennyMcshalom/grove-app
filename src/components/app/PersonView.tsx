"use client";

import { useState, useTransition } from "react";
import { IntroNote } from "@/components/app/BondsRail";
import { GrouvHero, GrouvPage, GrouvTabs } from "@/components/app/GrouvProfile";
import { GrouvRings, type RingPerson } from "@/components/app/GrouvRings";
import { BlockDialog, ReportPersonModal } from "@/components/app/bonds/SafetyDialogs";
import { useToast } from "@/components/app/ToastProvider";
import { Button } from "@/components/ui/Button";
import {
  blockUser,
  cancelConnectionRequest,
  connectWith,
  removeFromCircle,
  respondToRequest,
  unblockUser,
} from "@/lib/bond-actions";
import type { LogEntry } from "@/lib/log";
import type { FeedPage } from "@/lib/posts";
import type { Aura } from "@/lib/profile";

export interface Person {
  id: string;
  name: string;
  avatarUrl: string | null;
  aura: Aura;
  /** Their profile banner key; null is their default colour. */
  banner: string | null;
  /** Null when their audience for it leaves the viewer out (profile_for). */
  locationLabel: string | null;
  /** Empty when their current-chapter audience leaves the viewer out. */
  chapters: { slug: string; phase: string; shared: boolean }[];
  bio?: string | null;
  birthday?: string | null;
  relationship: "bond" | "circle" | "requested" | "asked_you" | "none";
  /** The pending request, when there is one. */
  connectionId: string | null;
  /** The note they introduced themselves with, while it waits on the viewer. */
  intro?: { message: string; prompt: string | null } | null;
  /** The viewer has blocked them. */
  blocked: boolean;
  /** Only bonds can read these. */
  prompts: { honestTension: string | null; sittingWith: string | null; openTo: string | null } | null;
  /** The faces on their rings: the viewer and connections you share. */
  people: RingPerson[];
}

/** A one-line "are you sure?" under the actions. */
export function ConfirmBar({
  message,
  action,
  busy,
  onConfirm,
  onCancel,
}: {
  message: string;
  action: string;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div role="alert" className="flex flex-col gap-3 rounded-lg bg-ivory-100 p-4">
      <p className="font-sans text-sm text-ink-600">{message}</p>
      <div className="flex gap-3">
        <Button size="sm" onClick={onConfirm} loading={busy}>
          {action}
        </Button>
        <Button variant="tertiary" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

const RELATIONSHIP_LABEL: Record<Person["relationship"], string | null> = {
  bond: "Bonded",
  circle: "In your circle",
  requested: "Request sent",
  asked_you: "Wants to connect",
  none: null,
};

/**
 * Someone's Grouv — the same page as Your Grouv (GrouvProfile): their
 * banner and rings, their card with Connect / Message and the safety
 * options, then their posts and logged moments as far as RLS lets you see.
 */
export function PersonView({ person, posts, logs }: { person: Person; posts: FeedPage; logs: LogEntry[] }) {
  const toast = useToast();
  const [relationship, setRelationship] = useState(person.relationship);
  const [blocked, setBlocked] = useState(person.blocked);
  const [confirming, setConfirming] = useState<"remove" | "block" | null>(null);
  const [reporting, setReporting] = useState(false);
  const [pending, startTransition] = useTransition();

  const connect = () =>
    startTransition(async () => {
      const result = await connectWith(person.id);
      if (result.error) return toast({ title: result.error, tone: "danger" });
      setRelationship(result.status === "accepted" ? "circle" : "requested");
      toast({ title: result.status === "accepted" ? "You're connected" : "Connection request sent", tone: "confirm" });
    });

  const cancelRequest = () =>
    startTransition(async () => {
      const result = await cancelConnectionRequest(person.id);
      if (result.error) return toast({ title: result.error, tone: "danger" });
      setRelationship("none");
      toast({ title: "Request cancelled" });
    });

  const remove = () =>
    startTransition(async () => {
      const result = await removeFromCircle(person.id);
      setConfirming(null);
      if (result.error) return toast({ title: result.error, tone: "danger" });
      setRelationship("none");
      toast({ title: `${person.name} is no longer in your circle` });
    });

  const block = () =>
    startTransition(async () => {
      const result = blocked ? await unblockUser(person.id) : await blockUser(person.id);
      setConfirming(null);
      if (result.error) return toast({ title: result.error, tone: "danger" });
      if (!blocked) setRelationship("none");
      setBlocked(!blocked);
      toast({ title: blocked ? `Unblocked ${person.name}` : `Blocked ${person.name}` });
    });

  const respond = (accept: boolean) =>
    startTransition(async () => {
      if (!person.connectionId) return;
      const result = await respondToRequest(person.connectionId, accept);
      if (result.error) return toast({ title: result.error, tone: "danger" });
      setRelationship(accept ? "circle" : "none");
    });

  const connected = relationship === "circle" || relationship === "bond";

  return (
    <GrouvPage
      title={person.name}
      back="/search"
      hero={
        <GrouvHero banner={person.banner} seed={person.id}>
          <GrouvRings
            subject={{
              id: person.id,
              name: person.name,
              avatarUrl: person.avatarUrl,
              aura: person.aura,
              locationLabel: person.locationLabel,
              chapters: person.chapters,
              bio: person.bio,
              birthday: person.birthday,
              self: false,
            }}
            // Nothing of theirs shows while you've blocked them.
            people={blocked ? [] : person.people}
            prompts={{
              struggling: person.prompts?.honestTension ?? null,
              building: person.prompts?.sittingWith ?? null,
              open: person.prompts?.openTo ?? null,
            }}
            promptsHidden={person.prompts === null}
            label={RELATIONSHIP_LABEL[relationship]}
          >
            {relationship === "asked_you" && person.intro && (
              <div className="flex flex-col gap-2">
                <span className="font-sans text-sm font-medium text-ink-500">
                  {person.name} introduced themselves
                </span>
                <IntroNote message={person.intro.message} prompt={person.intro.prompt} />
              </div>
            )}

            <div className="flex flex-wrap gap-3 pt-1">
              {relationship === "none" && !blocked && (
                <Button size="sm" onClick={connect} loading={pending}>
                  Connect
                </Button>
              )}
              {relationship === "requested" && (
                <Button variant="secondary" size="sm" onClick={cancelRequest} loading={pending}>
                  Cancel request
                </Button>
              )}
              {relationship === "asked_you" && (
                <>
                  <Button size="sm" onClick={() => respond(true)} disabled={pending}>
                    Accept
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => respond(false)} disabled={pending}>
                    Decline
                  </Button>
                </>
              )}
              {connected && (
                <Button size="sm" href={`/bonds?with=${person.id}`}>
                  Message
                </Button>
              )}
              {connected && (
                <Button variant="secondary" size="sm" onClick={() => setConfirming("remove")} disabled={pending}>
                  Remove from circle
                </Button>
              )}
              <Button variant="tertiary" size="sm" onClick={() => setConfirming("block")} disabled={pending}>
                {blocked ? "Unblock" : "Block"}
              </Button>
              <Button variant="tertiary" size="sm" onClick={() => setReporting(true)}>
                Report
              </Button>
            </div>
            {confirming && !(confirming === "block" && !blocked) && (
              <ConfirmBar
                message={
                  confirming === "remove"
                    ? `Remove ${person.name} from your circle? ${relationship === "bond" ? "Your bond ends too. " : ""}Everything you've shared stays.`
                    : blocked
                      ? `Unblock ${person.name}? You'll need to connect again to talk.`
                      : `Block ${person.name}? They won't be able to message, call, connect with or see you nearby.`
                }
                action={confirming === "remove" ? "Remove" : blocked ? "Unblock" : "Block"}
                busy={pending}
                onConfirm={confirming === "remove" ? remove : block}
                onCancel={() => setConfirming(null)}
              />
            )}
          </GrouvRings>
        </GrouvHero>
      }
    >
      {/* Their Grouv, as Your Grouv shows yours (417:16407 / 435:18506). */}
      {!blocked && (
        <section aria-label={`${person.name}'s Grouv`}>
          <GrouvTabs
            labels={["Posts", "Grouv Logs"]}
            postsQuery={{ scope: "person", authorId: person.id }}
            posts={posts}
            postsEmpty={<GridEmpty>{person.name} hasn&rsquo;t shared any posts with you yet.</GridEmpty>}
            logs={logs}
            logsEmpty={<GridEmpty>{person.name}&rsquo;s logged moments aren&rsquo;t shared with you yet.</GridEmpty>}
          />
        </section>
      )}

      {/* Block / Report — the same dialogs as Home's profile menu (1689:44046 / 1689:44028). */}
      {confirming === "block" && !blocked && (
        <BlockDialog
          userId={person.id}
          name={person.name}
          context={relationship === "bond" ? "bond" : "circle"}
          onClose={() => setConfirming(null)}
          onBlocked={() => {
            setBlocked(true);
            setRelationship("none");
          }}
        />
      )}
      {reporting && <ReportPersonModal userId={person.id} what="profile" onClose={() => setReporting(false)} />}
    </GrouvPage>
  );
}

function GridEmpty({ children }: { children: React.ReactNode }) {
  return (
    <p className="mx-auto w-full max-w-[720px] rounded-3xl bg-surface px-4 py-10 text-center font-sans text-sm text-ink-300">
      {children}
    </p>
  );
}
