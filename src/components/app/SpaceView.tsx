"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { Avatar } from "@/components/app/Avatar";
import { EmptyFeed } from "@/components/app/EmptyFeed";
import { FeedList } from "@/components/app/FeedList";
import { RightRail } from "@/components/app/RightRail";
import { useToast } from "@/components/app/ToastProvider";
import { FormError } from "@/components/auth/FormError";
import { ArrowRight } from "@/components/ui/ArrowRight";
import { Button } from "@/components/ui/Button";
import {
  askSpace,
  connectWithMember,
  inviteMemberToBond,
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
}

export function SpaceView({
  slug,
  phase,
  roots,
  members: initialMembers,
  questions: initialQuestions,
}: {
  slug: string;
  phase: string;
  roots: FeedPage;
  members: SpaceMember[];
  questions: SpaceQuestion[];
}) {
  const chapter = getChapter(slug)!;
  const toast = useToast();
  const [tab, setTab] = useState<(typeof TABS)[number]>(TABS[0]);
  const [members, setMembers] = useState(initialMembers);
  const [questions, setQuestions] = useState(initialQuestions);

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

  const invite = async (userId: string) => {
    const result = await inviteMemberToBond(userId, slug);
    if (result.error) {
      toast({ title: result.error, tone: "danger" });
      return;
    }
    updateMember(userId, { bond: result.status === "active" ? "active" : "pending" });
    toast({ title: result.status === "active" ? "You're bonded" : "Invite sent" });
  };

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 items-center gap-2 bg-white px-6 py-6 lg:px-8">
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
                <p className="font-sans text-base text-ink-500">{phase}</p>
                <div className="flex flex-wrap items-center gap-1">
                  {faces.length > 0 && (
                    <span className="flex">
                      {faces.map((m, i) => (
                        <span
                          key={m.userId}
                          className="rounded-full border-2 border-white"
                          style={{ marginLeft: i === 0 ? 0 : -6 }}
                        >
                          <Avatar src={m.avatarUrl} name={m.name} sizes="24px" className="size-5" />
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
              />
            )}

            {tab === "Open" && (
              <div className="flex flex-col gap-6">
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-5">
                  <div className="flex flex-col gap-1">
                    <span className="font-sans text-base font-semibold text-ink-600">
                      Search across regions
                    </span>
                    <span className="font-sans text-sm text-ink-300">
                      See this space beyond people near you
                    </span>
                  </div>
                  {/* Needs region-aware matching, which arrives with Nearby. */}
                  <Button variant="secondary" size="sm" disabled title="Coming with Nearby">
                    Search
                  </Button>
                </div>

                <p className="font-sans text-sm text-ink-400">
                  Posts from people outside your circle, in the same stage.
                  Connect to bring them in
                </p>

                <FeedList
                  query={{ scope: "open", chapterSlug: slug }}
                  empty={
                    <p className="py-6 text-center font-sans text-sm text-ink-300">
                      No one outside your circle has posted from where you are yet.
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
                      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-5"
                    >
                      <span className="flex min-w-0 flex-wrap items-center gap-2">
                        <Avatar src={member.avatarUrl} name={member.name} className="size-10" />
                        <span className="font-sans text-lg font-semibold text-ink-700">
                          {member.name}
                        </span>
                        <span className="rounded-full bg-ivory-500 px-2 py-1 font-sans text-xs font-medium text-ink-400">
                          {member.phase}
                        </span>
                      </span>
                      <PendingButton
                        disabled={member.bond !== "none"}
                        onClick={() => invite(member.userId)}
                        className="flex items-center gap-2 rounded-full bg-primary-100 px-3 py-2.5 font-ui text-sm font-medium text-primary-600 transition-colors hover:bg-primary-200 disabled:bg-ivory-400 disabled:text-ink-400"
                      >
                        {member.bond === "active" ? (
                          "Bonded"
                        ) : member.bond === "pending" ? (
                          "Invite sent"
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

      <RightRail variant="space" spaceMembers={members} />
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
    <article className="flex flex-col gap-3 rounded-2xl bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex min-w-0 flex-wrap items-center gap-2">
          <Avatar src={post.avatar} name={post.author} className="size-10" />
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
            className="rounded-full px-3 py-2.5 font-ui text-sm font-medium text-primary-600 transition-colors hover:bg-primary-50 disabled:text-ink-300 disabled:hover:bg-transparent"
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
        <div className="flex flex-col gap-3 rounded-2xl bg-white p-5">
          <textarea
            value={ask}
            onChange={(e) => setAsk(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="Ask the space something you're sitting with. Replies come back without names."
            className="w-full resize-y rounded-lg bg-ivory-100 px-3.5 py-2.5 font-sans text-base text-ink-500 outline-none placeholder:text-ink-500 focus:shadow-[0px_0px_0px_4px_rgba(249,189,152,0.25)]"
          />
          <FormError message={error} />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="font-sans text-sm text-ink-300">
              Live for 7 days &middot; Replies come back without names
            </span>
            <Button
              size="sm"
              disabled={!ask.trim()}
              loading={asking}
              onClick={() => {
                setError(undefined);
                startAsking(async () => {
                  const result = await askSpace(slug, ask);
                  if (result.error || !result.question) {
                    setError(result.error);
                    return;
                  }
                  onAsked({ ...result.question, isMine: true, replyCount: 0 });
                  setAsk("");
                  toast({ title: "Anonymous question sent to space" });
                });
              }}
            >
              Ask
            </Button>
          </div>
        </div>
      </section>

      {questions.map((question) => (
        <div key={question.id} className="flex flex-col gap-4 rounded-2xl bg-white p-5">
          <p className="rounded-lg bg-ivory-100 px-4 py-3 font-sans text-base text-ink-500">
            &ldquo;{question.body}&rdquo;
          </p>
          <QuestionReplies question={question} />
        </div>
      ))}
    </div>
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
              <li className="font-sans text-sm text-ink-300">Loading replies…</li>
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
        {reply.mine ? "Your reply" : "Someone in this space"}
        {reply.durationSeconds ? ` · ${formatSeconds(reply.durationSeconds)}` : ""}
      </span>
      {reply.audioUrl && <audio controls preload="none" src={reply.audioUrl} className="w-full" />}
      {reply.body && <p className="font-sans text-sm whitespace-pre-line text-ink-500">{reply.body}</p>}
    </li>
  );
}
