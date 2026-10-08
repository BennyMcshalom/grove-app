"use client";

import Image from "next/image";
import { useEffect, useState, useTransition } from "react";
import { Avatar } from "@/components/app/Avatar";
import { ShareSheet } from "@/components/app/ShareSheet";
import { useToast } from "@/components/app/ToastProvider";
import { useViewer } from "@/components/app/ViewerProvider";
import { MomentPicker, splitMomentKeys } from "@/components/app/companions/MomentPicker";
import { InvitationCard } from "@/components/app/invite/InvitationCard";
import { FormError } from "@/components/auth/FormError";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal, ModalClose, ModalHeader, ModalStatus } from "@/components/ui/Modal";
import { PersonRowsSkeleton } from "@/components/ui/Skeleton";
import { loadInvitePeople, loadInviteSetup, sendCompanionInvite } from "@/lib/invite-actions";
import type { Chapter } from "@/lib/chapters";
import type { InvitePerson, PickableMoment } from "@/lib/invites";
import { cn } from "@/lib/cn";

const TEXTAREA =
  "w-full resize-y rounded-lg bg-ivory-100 px-3.5 py-2.5 font-sans text-base text-ink-500 outline-none placeholder:text-ink-200 focus:shadow-[0px_0px_0px_4px_rgba(249,189,152,0.25)]";

/**
 * CHAPTER COMPANIONS — "Invite someone to walk with me".
 *
 * Compose (the chapter card, who, why, where you are now, what would help,
 * the next milestone, and what they can see) → pick the moments for "Story
 * so far" → Preview (exactly the invitation they'll get) → Invitation ready
 * (the link, Copy, Share). Accepting never opens a Space for them.
 */
export function ChapterInviteModal({
  userChapterId,
  chapter,
  phase,
  onClose,
}: {
  userChapterId: string;
  chapter: Chapter;
  phase: string;
  onClose: () => void;
}) {
  const viewer = useViewer();
  const toast = useToast();
  const [step, setStep] = useState<"compose" | "who" | "moments" | "preview" | "sent">("compose");
  const [people, setPeople] = useState<InvitePerson[] | null>(null);
  const [moments, setMoments] = useState<PickableMoment[] | null>(null);
  const [recipient, setRecipient] = useState<InvitePerson | null>(null);
  const [query, setQuery] = useState("");
  const [why, setWhy] = useState("");
  const [whereNow, setWhereNow] = useState("");
  const [ask, setAsk] = useState("");
  const [milestone, setMilestone] = useState("");
  const [milestoneDate, setMilestoneDate] = useState("");
  const [share, setShare] = useState({ story: true, current: true, future: true });
  const [picked, setPicked] = useState<string[]>([]);
  const [error, setError] = useState<string>();
  const [link, setLink] = useState<string>();
  const [sending, startSending] = useTransition();

  useEffect(() => {
    let cancelled = false;
    loadInvitePeople(chapter.slug).then((rows) => {
      if (!cancelled) setPeople(rows);
    });
    loadInviteSetup(userChapterId).then((setup) => {
      if (cancelled) return;
      setMoments(setup.moments);
      // Where you are now belongs to the chapter: start from the latest.
      setWhereNow((v) => v || setup.note.whereNow);
      setMilestone((v) => v || setup.note.milestone);
      setMilestoneDate((v) => v || setup.note.milestoneDate);
    });
    return () => {
      cancelled = true;
    };
  }, [chapter.slug, userChapterId]);

  const name = recipient?.name ?? "them";
  const storyCount = share.story ? picked.length : 0;

  const send = () =>
    startSending(async () => {
      setError(undefined);
      const result = await sendCompanionInvite({
        userChapterId,
        title: phase,
        why,
        ask,
        whereNow,
        milestone,
        milestoneDate,
        share,
        ...splitMomentKeys(share.story ? picked : []),
        recipient: recipient?.userId ?? null,
      });
      if (result.error || !result.link) {
        setError(result.error);
        return;
      }
      setLink(result.link);
      setStep("sent");
      if (recipient) {
        toast({
          title: "Invitation sent",
          description: `${recipient.name} will see it in their invitations. Nothing changes until they accept.`,
        });
      }
    });

  if (step === "sent" && link) {
    return (
      <Modal label="Invitation ready" onClose={onClose} width="max-w-[480px]">
        <ModalStatus icon={<LinkIcon />} title="Invitation ready">
          {recipient
            ? `Send ${recipient.name} this link too, if you like. It only works for them.`
            : "Share this link with the person you’d like beside you. They can join Grouv or sign in to accept."}
        </ModalStatus>
        <ShareLink link={link} senderName={viewer.firstName} chapterName={chapter.name} />
        <Button variant="secondary" fullWidth onClick={onClose}>
          Done
        </Button>
      </Modal>
    );
  }

  if (step === "preview") {
    return (
      <Modal label="Preview" onClose={onClose} width="max-w-[560px]">
        <ModalHeader title="Preview" onClose={onClose} />
        <p className="-mt-3 font-sans text-sm text-ink-300">
          This is exactly what {recipient ? recipient.name : "they’ll"} {recipient ? "will " : ""}see.
        </p>
        <div className="rounded-2xl border border-ink-50 p-4 sm:p-5">
          <InvitationCard
            senderName={viewer.firstName}
            chapterSlug={chapter.slug}
            phase={phase}
            title={phase}
            why={why.trim() || null}
            ask={ask.trim() || null}
            share={share}
            momentCount={storyCount}
          />
        </div>
        <div className="flex flex-col gap-3">
          <FormError message={error} />
          <Button fullWidth loading={sending} onClick={send}>
            Send invitation
          </Button>
          <Button variant="secondary" fullWidth disabled={sending} onClick={() => setStep("compose")}>
            Edit
          </Button>
        </div>
      </Modal>
    );
  }

  if (step === "moments") {
    return (
      <Modal label="Story so far" onClose={onClose} width="max-w-[560px]" className="max-h-[calc(100dvh-2rem)]">
        <div className="flex flex-col gap-2">
          <ModalHeader title="Story so far" onClose={onClose} />
          <p className="font-sans text-sm text-ink-300">
            Pick the moments {name} can see. Everything else in your Log stays private.
          </p>
        </div>
        <div className="-mx-1 min-h-0 flex-1 scroll-slim overflow-y-auto px-1">
          {moments === null ? (
            <PersonRowsSkeleton count={3} label="Loading your moments" />
          ) : (
            <MomentPicker
              moments={moments}
              picked={picked}
              onToggle={(key) => setPicked((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))}
            />
          )}
        </div>
        <Button fullWidth onClick={() => setStep("compose")}>
          {picked.length === 0 ? "Done" : `Use ${picked.length} ${picked.length === 1 ? "moment" : "moments"}`}
        </Button>
      </Modal>
    );
  }

  if (step === "who") {
    const needle = query.trim().toLowerCase();
    const match = (p: InvitePerson) => !needle || p.name.toLowerCase().includes(needle);
    const bonds = (people ?? []).filter((p) => p.group === "bond" && match(p));
    const suggested = (people ?? []).filter((p) => p.group === "suggested" && match(p));
    const pick = (p: InvitePerson) => {
      setRecipient(p);
      setStep("compose");
    };

    return (
      <Modal label="Who would you like beside you?" onClose={onClose} className="max-h-[calc(100dvh-2rem)]">
        <div className="flex flex-col gap-2">
          <ModalHeader title="Who would you like beside you?" onClose={onClose} />
          <p className="font-sans text-sm text-ink-300">
            Someone in your circle or this Space. Not on Grouv yet? Skip this and share the link instead.
          </p>
        </div>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search people"
          aria-label="Search people"
          iconLeft={<SearchIcon />}
        />
        <div className="-mx-1 flex min-h-0 flex-1 scroll-slim flex-col gap-6 overflow-y-auto px-1">
          {people === null ? (
            <PersonRowsSkeleton count={4} label="Loading people" />
          ) : bonds.length + suggested.length === 0 ? (
            <p className="py-6 text-center font-sans text-sm text-ink-300">
              {needle ? "No one by that name." : "No one to pick yet. Share the link instead."}
            </p>
          ) : (
            <>
              {bonds.length > 0 && <PeopleGroup title="Your bond" people={bonds} chosen={recipient?.userId} onPick={pick} />}
              {suggested.length > 0 && (
                <PeopleGroup title="Suggested people" people={suggested} chosen={recipient?.userId} onPick={pick} />
              )}
            </>
          )}
        </div>
        <Button
          variant="secondary"
          fullWidth
          onClick={() => {
            setRecipient(null);
            setStep("compose");
          }}
        >
          Someone not on Grouv — I&rsquo;ll share a link
        </Button>
      </Modal>
    );
  }

  const nothingShared = !share.story && !share.current && !share.future;

  return (
    <Modal label="Invite into my chapter" onClose={onClose} width="max-w-[560px]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <span className="font-sans text-xs font-semibold tracking-wide text-primary-600 uppercase">
            Chapter companions
          </span>
          <h2 className="font-display text-2xl font-semibold text-ink-800">Invite into my chapter</h2>
          <p className="font-sans text-sm text-ink-300">
            Choose what {recipient ? recipient.name : "they"} can see and why you want them here.
          </p>
        </div>
        <ModalClose onClose={onClose} className="-mt-3 -mr-3 shrink-0" />
      </div>

      <div className={cn("flex items-center gap-3 rounded-2xl p-4", chapter.cardClass)}>
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-surface">
          <Image src={chapter.icon} alt="" width={32} height={32} className="size-8" />
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="font-sans text-sm font-medium text-ink-500">{chapter.name} chapter</span>
          <span className="truncate font-display text-lg font-semibold text-ink-800">{phase}</span>
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="font-sans text-sm font-medium text-ink-500">Invite</span>
        {recipient ? (
          <span className="flex w-fit items-center gap-2 rounded-full bg-primary-50 py-1 pr-1 pl-1">
            <Avatar src={recipient.avatarUrl} name={recipient.name} sizes="28px" className="size-7" />
            <span className="font-sans text-sm font-medium text-ink-700">{recipient.name}</span>
            <button
              type="button"
              onClick={() => setStep("who")}
              className="rounded-full px-2.5 py-1 font-ui text-xs font-medium text-primary-600 hover:bg-primary-100"
            >
              Change
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setStep("who")}
            className="flex items-center gap-3 rounded-lg border border-dashed border-primary-300 px-3.5 py-3 text-left transition-colors hover:bg-primary-50"
          >
            <span className="grid size-8 place-items-center rounded-full bg-primary-100 text-primary-600" aria-hidden="true">
              +
            </span>
            <span className="flex flex-col">
              <span className="font-sans text-sm font-medium text-ink-700">Choose someone</span>
              <span className="font-sans text-xs text-ink-300">Or leave it and share a link with anyone</span>
            </span>
          </button>
        )}
      </div>

      <Field label={recipient ? `Why ${recipient.name}?` : "Why them?"}>
        <textarea
          value={why}
          onChange={(e) => setWhy(e.target.value)}
          rows={3}
          maxLength={1000}
          placeholder="You’ve been through this yourself, and you always ask the honest question."
          className={TEXTAREA}
        />
      </Field>
      <Field label="Where are you now?">
        <textarea
          value={whereNow}
          onChange={(e) => setWhereNow(e.target.value)}
          rows={3}
          maxLength={1000}
          placeholder="Two interviews in, still deciding what balance means for me."
          className={TEXTAREA}
        />
      </Field>
      <Field label={recipient ? `What would help from ${recipient.name}?` : "What would help from them?"}>
        <textarea
          value={ask}
          onChange={(e) => setAsk(e.target.value)}
          rows={2}
          maxLength={1000}
          placeholder="A check-in before big days. Honest questions when I’m going in circles."
          className={TEXTAREA}
        />
      </Field>
      <div className="flex flex-col gap-1.5">
        <span className="font-sans text-sm font-medium text-ink-500">Next milestone</span>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="min-w-0 flex-1">
            <Input
              value={milestone}
              maxLength={200}
              onChange={(e) => setMilestone(e.target.value)}
              placeholder="Final-round interview"
              aria-label="Next milestone"
            />
          </div>
          <div className="sm:w-44">
            <Input
              type="date"
              value={milestoneDate}
              onChange={(e) => setMilestoneDate(e.target.value)}
              aria-label="Milestone date (optional)"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <span className="font-sans text-sm font-medium text-ink-500">Share with {recipient ? recipient.name : "them"}</span>
        <ShareOption
          checked={share.story}
          onChange={(story) => setShare((s) => ({ ...s, story }))}
          title="Story so far"
          detail={
            picked.length === 0
              ? "Pick moments from this chapter"
              : `${picked.length} ${picked.length === 1 ? "moment" : "moments"} you selected`
          }
          action={
            share.story ? (
              <button
                type="button"
                onClick={() => setStep("moments")}
                className="shrink-0 rounded-full px-3 py-1.5 font-ui text-sm font-medium text-primary-600 hover:bg-primary-50"
              >
                {picked.length === 0 ? "Choose" : "Edit"}
              </button>
            ) : null
          }
        />
        <ShareOption
          checked={share.current}
          onChange={(current) => setShare((s) => ({ ...s, current }))}
          title="Current note and milestone"
          detail="Where you are now and what’s next"
        />
        <ShareOption
          checked={share.future}
          onChange={(future) => setShare((s) => ({ ...s, future }))}
          title="Future updates I choose to share"
          detail="Only the ones you send their way"
        />
      </div>

      <FormError message={error ?? (nothingShared ? "Choose at least one thing to share." : undefined)} />
      <Button fullWidth disabled={nothingShared} onClick={() => setStep("preview")}>
        Preview invitation
      </Button>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-sans text-sm font-medium text-ink-500">{label}</span>
      {children}
    </label>
  );
}

function ShareOption({
  checked,
  onChange,
  title,
  detail,
  action,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  title: string;
  detail: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-ivory-100 px-3.5 py-3">
      <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="size-5 shrink-0 accent-primary-500"
        />
        <span className="flex min-w-0 flex-col">
          <span className="font-sans text-sm font-medium text-ink-700">{title}</span>
          <span className="truncate font-sans text-xs text-ink-300">{detail}</span>
        </span>
      </label>
      {action}
    </div>
  );
}

function PeopleGroup({
  title,
  people,
  chosen,
  onPick,
}: {
  title: string;
  people: InvitePerson[];
  chosen?: string;
  onPick: (person: InvitePerson) => void;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="font-sans text-xs font-semibold tracking-wide text-ink-300 uppercase">{title}</h3>
      <ul className="flex flex-col gap-1">
        {people.map((p) => (
          <li key={p.userId}>
            <button
              type="button"
              onClick={() => onPick(p)}
              aria-pressed={chosen === p.userId}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-ivory-100",
                chosen === p.userId && "bg-primary-50",
              )}
            >
              <Avatar src={p.avatarUrl} name={p.name} sizes="48px" className="size-12 shrink-0" />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate font-sans text-base font-medium text-ink-600">{p.name}</span>
                <span className="truncate font-sans text-xs text-ink-200">{p.detail}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The link, Copy, and Share (the phone's sheet, or Grouv's own on desktop). */
function ShareLink({ link, senderName, chapterName }: { link: string; senderName: string; chapterName: string }) {
  const toast = useToast();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 rounded-lg bg-ivory-100 px-3.5 py-2.5">
        <span className="min-w-0 flex-1 truncate font-sans text-sm text-ink-500">{link}</span>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(link);
              toast({ title: "Link copied" });
            } catch {
              toast({ title: "Couldn't copy the link", tone: "danger" });
            }
          }}
          className="shrink-0 rounded-full px-3 py-1.5 font-ui text-sm font-medium text-primary-600 hover:bg-primary-50"
        >
          Copy
        </button>
      </div>
      <ShareSheet
        url={link}
        title="Walk with me through this chapter"
        text={`${senderName} would like you beside them in their ${chapterName} chapter on Grouv.`}
        trigger={(open) => (
          <Button fullWidth onClick={open}>
            Share
          </Button>
        )}
      />
    </div>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="size-5 text-ink-300" aria-hidden="true">
      <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.6" />
      <path d="m13.5 13.5 3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-6" aria-hidden="true">
      <path
        d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
