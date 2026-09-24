"use client";

import { useState, useTransition } from "react";
import { Avatar } from "@/components/app/Avatar";
import { ReportPostModal } from "@/components/app/PostModals";
import { TopBar } from "@/components/app/TopBar";
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
import { getChapter } from "@/lib/chapters";
import { cn } from "@/lib/cn";
import { AURAS, auraLabel, type Aura } from "@/lib/profile";

export interface Person {
  id: string;
  name: string;
  avatarUrl: string | null;
  aura: Aura;
  locationLabel: string | null;
  chapters: { slug: string; phase: string; shared: boolean }[];
  relationship: "bond" | "circle" | "requested" | "asked_you" | "none";
  /** The pending request, when there is one. */
  connectionId: string | null;
  /** The viewer has blocked them. */
  blocked: boolean;
  /** Only bonds can read these. */
  prompts: { honestTension: string | null; sittingWith: string | null; openTo: string | null } | null;
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

export function PersonView({ person }: { person: Person }) {
  const toast = useToast();
  const [relationship, setRelationship] = useState(person.relationship);
  const [blocked, setBlocked] = useState(person.blocked);
  const [confirming, setConfirming] = useState<"remove" | "block" | null>(null);
  const [reporting, setReporting] = useState(false);
  const [pending, startTransition] = useTransition();
  const aura = AURAS.find((a) => a.value === person.aura);
  const label = RELATIONSHIP_LABEL[relationship];

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

  const prompts = person.prompts
    ? [
        { label: "Honest tension", value: person.prompts.honestTension },
        { label: "Sitting with", value: person.prompts.sittingWith },
        { label: "Open to", value: person.prompts.openTo },
      ].filter((p) => p.value)
    : [];

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <TopBar title={person.name} back="/search" />

      <div className="min-h-0 flex-1 scroll-slim overflow-y-auto px-4 py-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-[724px] flex-col gap-6 pb-10">
          <section className="w-full overflow-hidden rounded-lg bg-surface shadow-[0px_1px_2px_0px_rgba(23,23,23,0.05)]">
            <div className="h-20" style={{ backgroundImage: "var(--wash-banner)" }} />
            <div className="flex flex-col gap-4 px-5 pb-6 sm:px-8">
              <span className="-mt-10 block size-20 rounded-full border-4 border-surface">
                <Avatar src={person.avatarUrl} name={person.name} sizes="80px" className="size-full" />
              </span>
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-sans text-xl font-semibold text-ink-800">{person.name}</h1>
                  {label && (
                    <span className="rounded-full bg-primary-50 px-2.5 py-0.5 font-sans text-xs font-medium text-primary-800">
                      {label}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 font-sans text-sm text-ink-400">
                  <span className="flex items-center gap-1.5">
                    <span className={cn("size-2 rounded-full", aura?.dot === "bg-surface" ? "bg-primary-600" : aura?.dot)} />
                    {auraLabel(person.aura)}
                  </span>
                  {person.locationLabel && <span>· {person.locationLabel}</span>}
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
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
                {(relationship === "circle" || relationship === "bond") && (
                  <Button size="sm" href={`/bonds?with=${person.id}`}>
                    Message
                  </Button>
                )}
                {(relationship === "circle" || relationship === "bond") && (
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
              {confirming && (
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
            </div>
          </section>

          {person.chapters.length > 0 && (
            <section className="flex flex-col gap-3.5 rounded-lg bg-surface px-5 py-4 shadow-[0px_1px_2px_0px_rgba(23,23,23,0.05)]">
              <h2 className="font-sans text-sm text-ink-200 uppercase">Holding</h2>
              <ul className="flex flex-col gap-3">
                {person.chapters.map((chapter) => (
                  <li key={chapter.slug} className="flex items-center justify-between gap-4">
                    <span className="flex flex-col">
                      <span className="font-sans text-base font-medium text-ink-600">
                        {getChapter(chapter.slug)?.name ?? chapter.slug}
                      </span>
                      <span className="font-sans text-sm text-ink-300">{chapter.phase}</span>
                    </span>
                    {chapter.shared && (
                      <span className="shrink-0 rounded-full bg-ivory-500 px-2 py-1 font-sans text-xs font-medium text-ink-400">
                        You hold this too
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {prompts.length > 0 && (
            <section className="flex flex-col gap-4 rounded-lg bg-surface px-5 py-4 shadow-[0px_1px_2px_0px_rgba(23,23,23,0.05)]">
              <h2 className="font-sans text-sm text-ink-200 uppercase">Between bonds</h2>
              {prompts.map((prompt) => (
                <div key={prompt.label} className="flex flex-col gap-1.5">
                  <span className="font-sans text-sm font-medium text-ink-500">{prompt.label}</span>
                  <span className="rounded-lg bg-ivory-100 px-3.5 py-2.5 font-sans text-sm text-ink-400">{prompt.value}</span>
                </div>
              ))}
            </section>
          )}
        </div>
      </div>

      {reporting && (
        <ReportPostModal
          postId={person.id}
          targetType="profile"
          onClose={() => setReporting(false)}
          onReported={() => {
            setReporting(false);
            toast({ title: "Thanks. We'll take a look.", tone: "confirm" });
          }}
        />
      )}
    </div>
  );
}
