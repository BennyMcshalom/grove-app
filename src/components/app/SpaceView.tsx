"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PersonRowsSkeleton } from "@/components/ui/Skeleton";
import { useEffect, useRef, useState, useTransition } from "react";
import { Avatar } from "@/components/app/Avatar";
import { CloseChapterWizard } from "@/components/app/CloseChapterWizard";
import { ChapterInviteModal } from "@/components/app/invite/ChapterInviteModal";
import { SpaceCompanionsStrip } from "@/components/app/companions/SpaceCompanionsStrip";
import { EmptyFeed } from "@/components/app/EmptyFeed";
import { FeedEnd, FeedList } from "@/components/app/FeedList";
import { RightRail } from "@/components/app/RightRail";
import { useToast } from "@/components/app/ToastProvider";
import { FormError } from "@/components/auth/FormError";
import { ArrowRight } from "@/components/ui/ArrowRight";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import {
  askSpace,
  connectWithMember,
  loadQuestionReplies,
  replyToQuestion,
  type QuestionReply,
} from "@/app/(app)/spaces/actions";
import { useViewer } from "@/components/app/ViewerProvider";
import { formatSeconds, VoiceRecorder } from "@/components/app/VoiceRecorder";
import { getChapter } from "@/lib/chapters";
import { cn } from "@/lib/cn";
import type { FeedPage, Post } from "@/lib/posts";
import { removeUploads, uploadFile } from "@/lib/upload";

/**
 * A space — Figma frames 172:3169 (Roots), 172:4641 (Open), 172:6133
 * (Anonymous) and 172:6458 (Ask Members).
 *
 * The chapter's status line above four tabs, beside the "IN THIS SPACE" rail.
 * All copy is Figma's.
 */
const TABS = ["Roots", "Open", "Anonymous", "Ask Members"] as const;

/** "People near you" on the Open tab. */
const NEAR_KM = 100;

export interface SpaceMember {
  userId: string;
  name: string;
  avatarUrl: string | null;
  phase: string;
  inCircle: boolean;
  connection: "none" | "requested" | "incoming" | "connected";
  bond: "none" | "pending" | "active";
}

export interface SpaceQuestion {
  id: string;
  body: string;
  isMine: boolean;
  replyCount: number;
  /** Only the asker gets this back ("2 DAYS LEFT"). */
  expiresAt?: string | null;
}

export function SpaceView({
  slug,
  userChapterId,
  phase,
  hasRegion,
  roots,
  members: initialMembers,
  questions: initialQuestions,
}: {
  slug: string;
  /** The viewer's held chapter, for inviting someone in and closing it. */
  userChapterId: string;
  phase: string;
  /** The viewer has a location, so the Open tab can start with people near them. */
  hasRegion: boolean;
  roots: FeedPage;
  members: SpaceMember[];
  questions: SpaceQuestion[];
}) {
  const chapter = getChapter(slug)!;
  const toast = useToast();
  const [tab, setTab] = useState<(typeof TABS)[number]>(TABS[0]);
  const [members, setMembers] = useState(initialMembers);
  const [questions, setQuestions] = useState(initialQuestions);
  const [acrossRegions, setAcrossRegions] = useState(!hasRegion);
  const [inviting, setInviting] = useState(false);
  const [closing, setClosing] = useState(false);
  const closed = useRef(false);
  const router = useRouter();

  const circle = members.filter((m) => m.inCircle);
  const faces = (circle.length > 0 ? circle : members).slice(0, 4);

  const updateMember = (userId: string, patch: Partial<SpaceMember>) =>
    setMembers((prev) => prev.map((m) => (m.userId === userId ? { ...m, ...patch } : m)));

  const connect = async (userId: string) => {
    const result = await connectWithMember(userId, slug);
    if (result.error) {
      toast({ title: result.error, tone: "danger" });
      return;
    }
    const connected = result.status === "accepted";
    updateMember(userId, { connection: connected ? "connected" : "requested", inCircle: connected });
    toast({
      title: connected
        ? "You're connected. They're in your circle now."
        : "Connect request sent. We'll let you know when they accept.",
    });
  };

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 items-center gap-2 bg-surface px-6 py-6 lg:px-8">
          {/* The phone frame (646:35168) leads with a back arrow. */}
          <Link href="/spaces" aria-label="Back to My Spaces" className="mr-1 shrink-0 text-ink-800 lg:hidden">
            <svg viewBox="0 0 24 24" fill="none" className="size-6" aria-hidden="true">
              <path d="M19 12H5m0 0 6-6m-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <Image
            src={chapter.icon}
            alt=""
            width={56}
            height={56}
            className="size-10 shrink-0"
          />
          <h1 className="font-display text-2xl font-semibold text-ink-600">
            {chapter.name}
          </h1>
        </header>

        <div className="min-h-0 flex-1 scroll-slim overflow-y-auto px-4 py-6 lg:px-8">
          <div className="mx-auto flex w-full max-w-[724px] flex-col gap-8 pb-10">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                {/* 172:3169 — the stage as the heading, "Invite someone" and the ⋮ menu (172:4609) beside it. */}
                <div className="flex items-start justify-between gap-3">
                  <h2 className="min-w-0 font-display text-2xl font-semibold text-ink-700">{phase}</h2>
                  <div className="flex shrink-0 items-center gap-2">
                    {/* The phone frame keeps only ⋮, so the invite moves into the menu there. */}
                    <Button variant="secondary" size="sm" className="hidden sm:flex" onClick={() => setInviting(true)}>
                      Invite someone to walk with me
                    </Button>
                    <SpaceMenu onInvite={() => setInviting(true)} onCloseChapter={() => setClosing(true)} />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  {faces.length > 0 && (
                    <span className="flex">
                      {faces.map((m, i) => (
                        <span
                          key={m.userId}
                          className="rounded-full border-2 border-surface"
                          style={{ marginLeft: i === 0 ? 0 : -6 }}
                        >
                          <Avatar src={m.avatarUrl} name={m.name} userId={m.userId} sizes="24px" className="size-5" />
                        </span>
                      ))}
                    </span>
                  )}
                  <span className="ml-2 font-sans text-xs text-ink-400">
                    {circle.length > 0
                      ? `${circle.length} ${circle.length === 1 ? "connection" : "connections"} in this space`
                      : `${members.length + 1} in this space`}
                  </span>
                </div>
                <span className="flex w-fit items-center gap-1 rounded-full bg-ivory-500 px-2 py-1">
                  <span className="size-1.5 rounded-full bg-primary-600" />
                  <span className="font-sans text-xs font-medium text-ink-400">
                    In progress
                  </span>
                </span>
                {/* Chapter Companions: who walks alongside this chapter. */}
                <SpaceCompanionsStrip slug={slug} userChapterId={userChapterId} />
              </div>

              <div role="tablist" className="flex">
                {TABS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    role="tab"
                    aria-selected={t === tab}
                    onClick={() => setTab(t)}
                    className={cn(
                      "h-10 flex-1 border-b-2 px-2 py-2 font-sans text-sm font-medium whitespace-nowrap transition-colors",
                      t === tab
                        ? "border-primary-600 text-ink-800"
                        : "border-ivory-600 text-ink-500 hover:border-ivory-700",
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {tab === "Roots" && (
              <FeedList
                query={{ scope: "roots", chapterSlug: slug }}
                initial={roots}
                empty={<EmptyFeed />}
                ending={<FeedEnd />}
              />
            )}

            {tab === "Open" && (
              <div className="flex flex-col gap-6">
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-surface p-5">
                  <div className="flex flex-col gap-1">
                    <span className="font-sans text-base font-semibold text-ink-600">
                      Search across regions
                    </span>
                    <span className="font-sans text-sm text-ink-300">
                      {!hasRegion
                        ? "Add your location in Edit Profile to see people near you first"
                        : "See this space beyond people near you"}
                    </span>
                  </div>
                  {hasRegion ? (
                    /* 172:4641 draws a switch here. */
                    <Switch
                      label="Search across regions"
                      checked={acrossRegions}
                      onChange={setAcrossRegions}
                    />
                  ) : (
                    <Button variant="secondary" size="sm" href="/settings/edit-profile">
                      Add location
                    </Button>
                  )}
                </div>

                <p className="font-sans text-sm text-ink-400">
                  Posts from people outside your circle, in the same stage.
                  Connect to bring them in
                </p>

                <FeedList
                  key={acrossRegions ? "open:everywhere" : "open:near"}
                  query={{ scope: "open", chapterSlug: slug, withinKm: acrossRegions ? null : NEAR_KM }}
                  empty={
                    <p className="py-6 text-center font-sans text-sm text-ink-300">
                      {acrossRegions
                        ? "No one at your stage has shared to Open Grouv lately."
                        : "No one near you has shared to Open Grouv lately. Try searching across regions."}
                    </p>
                  }
                  renderPost={(post) => (
                    <OpenPost
                      key={post.id}
                      post={post}
                      member={members.find((m) => m.userId === post.authorId)}
                      onConnect={connect}
                    />
                  )}
                />
              </div>
            )}

            {tab === "Anonymous" && (
              <AnonymousTab
                slug={slug}
                questions={questions}
                onAsked={(question) => setQuestions((prev) => [question, ...prev])}
              />
            )}

            {tab === "Ask Members" &&
              (members.length === 0 ? (
                <p className="py-6 text-center font-sans text-sm text-ink-300">
                  No one else holds this space yet.
                </p>
              ) : (
                <ul className="flex flex-col gap-4">
                  {members.map((member) => (
                    <li
                      key={member.userId}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-surface p-5"
                    >
                      {/* 172:6458 — the name opens their profile. */}
                      <Link href={`/people/${member.userId}`} className="flex min-w-0 items-center gap-3 hover:opacity-90">
                        <Avatar src={member.avatarUrl} name={member.name} className="size-10 shrink-0" />
                        <span className="flex min-w-0 flex-col items-start gap-1">
                          <span className="truncate font-sans text-lg font-semibold text-ink-700">
                            {member.name}
                          </span>
                          <span className="rounded-full bg-ivory-500 px-2 py-1 font-sans text-xs font-medium text-ink-400">
                            {member.phase}
                          </span>
                        </span>
                      </Link>
                      {/* Bonds are formed by the engine, never invited: members
                          can only be connected with here. */}
                      <PendingButton
                        disabled={member.bond === "active" || member.connection === "connected" || member.connection === "requested"}
                        onClick={() => connect(member.userId)}
                        className="flex items-center gap-2 rounded-full bg-primary-100 px-3 py-2.5 font-ui text-sm font-medium text-primary-600 transition-colors hover:bg-primary-200 disabled:bg-ivory-400 disabled:text-ink-400"
                      >
                        {member.bond === "active" ? (
                          "Bond"
                        ) : member.connection === "connected" ? (
                          "In your circle"
                        ) : member.connection === "requested" ? (
                          "Requested"
                        ) : member.connection === "incoming" ? (
                          "Accept"
                        ) : (
                          <>
                            Enter Grouv
                            <ArrowRight className="size-4" />
                          </>
                        )}
                      </PendingButton>
                    </li>
                  ))}
                </ul>
              ))}
          </div>
        </div>
      </div>

      <RightRail variant="space" spaceMembers={members} invitations />

      {inviting && (
        <ChapterInviteModal
          userChapterId={userChapterId}
          chapter={chapter}
          phase={phase}
          onClose={() => setInviting(false)}
        />
      )}
      {closing && (
        <CloseChapterWizard
          chapter={chapter}
          userChapterId={userChapterId}
          onClose={() => {
            setClosing(false);
            // Closed: this Space is in the Life Archive now.
            if (closed.current) router.push("/spaces");
          }}
          onClosed={() => {
            closed.current = true;
          }}
          onReopened={() => {
            closed.current = false;
          }}
        />
      )}
    </div>
  );
}

/** Frame 172:4609 — the ⋮ menu: "close chapter" (and, on a phone, the invite). */
function SpaceMenu({ onInvite, onCloseChapter }: { onInvite: () => void; onCloseChapter: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const item = "w-full px-5 py-3 text-left font-sans text-base text-ink-700 transition-colors hover:bg-ivory-100";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Space options"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="grid size-10 place-items-center rounded-full bg-primary-50 text-primary-600 transition-colors hover:bg-primary-100"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="size-5" aria-hidden="true">
          <circle cx="10" cy="4" r="1.6" />
          <circle cx="10" cy="10" r="1.6" />
          <circle cx="10" cy="16" r="1.6" />
        </svg>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute top-full right-0 z-20 mt-2 flex w-56 flex-col rounded-lg bg-surface py-2 shadow-[0px_0px_36px_0px_rgba(0,0,0,0.15)]"
        >
          <button
            type="button"
            role="menuitem"
            className={cn(item, "sm:hidden")}
            onClick={() => {
              setOpen(false);
              onInvite();
            }}
          >
            Invite someone to walk with me
          </button>
          <button
            type="button"
            role="menuitem"
            className={item}
            onClick={() => {
              setOpen(false);
              onCloseChapter();
            }}
          >
            Close chapter
          </button>
        </div>
      )}
    </div>
  );
}

/** Frame 172:4641's row: a post from outside the circle with a Connect action. */
function OpenPost({
  post,
  member,
  onConnect,
}: {
  post: Post;
  member?: SpaceMember;
  onConnect: (userId: string) => Promise<void>;
}) {
  const connection = member?.connection ?? "none";

  return (
    <article className="flex flex-col gap-3 rounded-2xl bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex min-w-0 flex-wrap items-center gap-2">
          <Avatar src={post.avatar} name={post.author} userId={post.anonymous ? null : post.authorId} className="size-10" />
          <span className="font-sans text-lg font-semibold text-ink-700">{post.author}</span>
          {post.authorPhase && (
            <span className="rounded-full bg-ivory-500 px-2 py-1 font-sans text-xs font-medium text-ink-400">
              {post.authorPhase}
            </span>
          )}
        </span>
        {post.authorId && connection !== "connected" && (
          <PendingButton
            disabled={connection === "requested"}
            onClick={() => onConnect(post.authorId!)}
            className="shrink-0 rounded-full border border-primary-500 px-3 py-2 font-ui text-sm font-medium text-primary-600 transition-colors hover:bg-primary-50 disabled:border-ink-100 disabled:text-ink-300 disabled:hover:bg-transparent"
          >
            {connection === "requested" ? "Requested" : connection === "incoming" ? "Accept" : "Connect"}
          </PendingButton>
        )}
      </div>
      {post.title && (
        <h2 className="font-sans text-xl font-semibold text-ink-700">{post.title}</h2>
      )}
      {post.body && (
        <p className="font-sans text-base whitespace-pre-line text-ink-400">{post.body}</p>
      )}
    </article>
  );
}

function AnonymousTab({
  slug,
  questions,
  onAsked,
}: {
  slug: string;
  questions: SpaceQuestion[];
  onAsked: (question: SpaceQuestion) => void;
}) {
  const toast = useToast();
  const [ask, setAsk] = useState("");
  const [error, setError] = useState<string>();
  const [asking, startAsking] = useTransition();

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4">
        <h2 className="font-sans text-base text-ink-400">YOUR ASK</h2>
        {/* 172:6133 — the ask card: a line of context, the field, Cancel / Ask this space. */}
        <div className="flex flex-col gap-4 rounded-2xl bg-surface p-5 lg:p-8">
          <p className="font-sans text-base text-ink-600">
            Ask the space something you&rsquo;re sitting with. Replies come back without names.
          </p>
          <textarea
            value={ask}
            onChange={(e) => setAsk(e.target.value)}
            rows={4}
            maxLength={1000}
            aria-label="Your question"
            placeholder="What you actually want to know from this space"
            className="w-full resize-y rounded-lg bg-ivory-100 px-3.5 py-2.5 font-sans text-base text-ink-500 outline-none placeholder:text-ink-200 focus:shadow-[0px_0px_0px_4px_rgba(249,189,152,0.25)]"
          />
          <FormError message={error} />
          <div className="flex items-center gap-3 pt-2">
            <Button
              variant="tertiary"
              size="sm"
              className="shrink-0 bg-ivory-300 px-8 text-ink-700 hover:bg-ivory-400"
              disabled={!ask || asking}
              onClick={() => {
                setAsk("");
                setError(undefined);
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              fullWidth
              disabled={!ask.trim()}
              loading={asking}
              iconLeft={<LockIcon />}
              onClick={() => {
                setError(undefined);
                startAsking(async () => {
                  const result = await askSpace(slug, ask);
                  if (result.error || !result.question) {
                    setError(result.error);
                    return;
                  }
                  onAsked({
                    ...result.question,
                    isMine: true,
                    replyCount: 0,
                    expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
                  });
                  setAsk("");
                  toast({ title: "Anonymous question sent to space" });
                });
              }}
            >
              Ask this space
            </Button>
          </div>
          <p className="text-center font-sans text-xs text-ink-300">
            Live for 7 days &middot; Replies come back without names
          </p>
        </div>
      </section>

      {questions.map((question) => (
        <div key={question.id} className="flex flex-col gap-4 rounded-2xl bg-surface p-5 lg:p-8">
          {/* "ACTIVE ASK · 2 DAYS LEFT" — times come back to the asker only. */}
          <div className="flex flex-col gap-3 rounded-lg bg-ivory-100 px-4 py-3">
            <span className="flex items-center gap-2 font-sans text-sm text-ink-300 uppercase">
              Active ask
              {question.expiresAt && (
                <>
                  <span className="size-1.5 rounded-full bg-ink-100" aria-hidden="true" />
                  <span suppressHydrationWarning>{daysLeft(question.expiresAt)}</span>
                </>
              )}
            </span>
            <p className="font-sans text-base text-ink-600">&ldquo;{question.body}&rdquo;</p>
          </div>
          <QuestionReplies question={question} />
        </div>
      ))}
    </div>
  );
}

/** "2 DAYS LEFT", "LAST DAY". */
function daysLeft(expiresAt: string) {
  const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (24 * 3600 * 1000));
  return days <= 1 ? "Last day" : `${days} days left`;
}

function LockIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="size-4" aria-hidden="true">
      <rect x="3" y="7" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

/** A button that disables itself while its async click handler runs. */
function PendingButton({
  onClick,
  disabled,
  className,
  children,
}: {
  onClick: () => Promise<void>;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const [pending, startPending] = useTransition();
  return (
    <button
      type="button"
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      onClick={() => startPending(onClick)}
      className={className}
    >
      {children}
    </button>
  );
}

/**
 * Under each question: the asker hears the replies; everyone else can record
 * (or write) one. Figma draws only the "Record a reply" pill; the rest follows
 * the card's own styles.
 */
function QuestionReplies({ question }: { question: SpaceQuestion }) {
  const viewer = useViewer();
  const toast = useToast();
  const [replies, setReplies] = useState<QuestionReply[] | null>(null);
  const [open, setOpen] = useState(false);
  const [writing, setWriting] = useState(false);
  const [draft, setDraft] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, startSending] = useTransition();

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && replies === null) setReplies(await loadQuestionReplies(question.id));
  };

  const send = (reply: { body?: string; audio?: Blob; seconds?: number }) =>
    startSending(async () => {
      let audioPath: string | undefined;
      if (reply.audio) {
        const uploaded = await uploadFile("media", viewer.id, reply.audio, {
          prefix: "reply-",
          fallbackExtension: "webm",
        });
        if ("error" in uploaded) {
          toast({ title: uploaded.error, tone: "danger" });
          return;
        }
        audioPath = uploaded.path;
      }
      const result = await replyToQuestion(question.id, {
        body: reply.body,
        audioPath,
        durationSeconds: reply.seconds ?? null,
      });
      if (result.error) {
        if (audioPath) removeUploads("media", [audioPath]);
        toast({ title: result.error, tone: "danger" });
        return;
      }
      setSent(true);
      setWriting(false);
      setDraft("");
      toast({ title: "Reply sent without your name" });
    });

  if (question.isMine) {
    return (
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={toggle}
          disabled={question.replyCount === 0}
          className="w-fit font-sans text-sm text-ink-300 enabled:hover:text-ink-500 enabled:hover:underline"
        >
          Your question &middot;{" "}
          {question.replyCount === 1 ? "1 reply" : `${question.replyCount} replies`}
          {question.replyCount > 0 && (open ? " · Hide" : " · Hear them")}
        </button>
        {open && (
          <ul className="flex flex-col gap-2">
            {replies === null ? (
              <li><PersonRowsSkeleton count={2} label="Loading replies" /></li>
            ) : (
              replies.map((reply) => <ReplyRow key={reply.id} reply={reply} />)
            )}
          </ul>
        )}
      </div>
    );
  }

  if (sent) {
    return (
      <p className="font-sans text-sm text-ink-300">
        Your reply is on its way. They won&rsquo;t see your name.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <VoiceRecorder disabled={sending} onRecorded={(audio, seconds) => send({ audio, seconds })} />
        {!writing && (
          <button
            type="button"
            onClick={() => setWriting(true)}
            className="font-sans text-sm text-ink-400 hover:underline"
          >
            or write one
          </button>
        )}
        {sending && <span className="font-sans text-sm text-ink-300">Sending…</span>}
      </div>
      {writing && (
        <form
          className="flex items-center gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (draft.trim()) send({ body: draft });
          }}
        >
          <input
            autoFocus
            value={draft}
            maxLength={2000}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Reply without your name"
            className="min-w-0 flex-1 rounded-lg bg-ivory-100 px-3.5 py-2.5 font-sans text-sm text-ink-500 outline-none focus:shadow-[0px_0px_0px_4px_rgba(249,189,152,0.25)]"
          />
          <Button type="submit" size="sm" loading={sending} disabled={!draft.trim()}>
            Reply
          </Button>
        </form>
      )}
    </div>
  );
}

function ReplyRow({ reply }: { reply: QuestionReply }) {
  return (
    <li className="flex flex-col gap-1 rounded-lg bg-ivory-100 px-4 py-3">
      <span className="font-sans text-xs text-ink-300">
        {reply.mine ? "Your reply" : "Someone in this chapter"}
        {reply.durationSeconds ? ` · ${formatSeconds(reply.durationSeconds)}` : ""}
      </span>
      {reply.audioUrl && <audio controls preload="none" src={reply.audioUrl} className="w-full" />}
      {reply.body && <p className="font-sans text-sm whitespace-pre-line text-ink-500">{reply.body}</p>}
    </li>
  );
}
