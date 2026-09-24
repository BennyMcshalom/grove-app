"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Avatar } from "@/components/app/Avatar";
import { RoomComposer, RoomMessageList, useRoomMessages } from "@/components/app/RoomChat";
import { SuggestedRail } from "@/components/app/SuggestedRail";
import { useToast } from "@/components/app/ToastProvider";
import { VideoViewer } from "@/components/app/VideoViewer";
import { useViewer } from "@/components/app/ViewerProvider";
import { formatSeconds } from "@/components/app/VoiceRecorder";
import {
  addVideoTruth,
  deleteTruth,
  deleteVideoTruth,
  joinGroup,
  leaveGroup,
  postTruth,
  reviewJoinRequest,
  setFelt,
  withdrawJoinRequest,
} from "@/app/(app)/groups/actions";
import { getChapter } from "@/lib/chapters";
import { cn } from "@/lib/cn";
import type { Group, JoinRequest, Truth, VideoTruth } from "@/lib/groups";
import { timeAgo } from "@/lib/time";
import { mediaDuration, removeUploads, uploadFile, UPLOAD_LIMITS } from "@/lib/upload";

/**
 * Chapter group — Figma frames 205:8408 / 222:13524 (Conversation),
 * 206:10081 (Truth Board) and 206:10507 (Video Truths).
 *
 * The group's blurb, member stack and label, then either the join request
 * card, the "Request sent" confirmation (222:13844) or the admin banner
 * (205:9937), then the three tabs. Members get the composer Figma draws for
 * admins; admins also see pending requests, which Figma has no frame for.
 */
const TABS = ["Conversation", "Truth Board", "Video Truths"] as const;

export function GroupView({
  group,
  truths,
  videos,
  requests,
}: {
  group: Group;
  truths: Truth[];
  videos: VideoTruth[];
  requests: JoinRequest[];
}) {
  const toast = useToast();
  const [tab, setTab] = useState<(typeof TABS)[number]>(TABS[0]);
  const [requested, setRequested] = useState(group.requestPending);
  const [joining, startJoining] = useTransition();
  const member = group.myRole !== null;
  const admin = group.myRole === "admin";
  const chat = useRoomMessages(group.conversationId, member);

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Frame 205:8480 — the glyph beside the group name. */}
        <header className="flex shrink-0 items-center gap-2 bg-surface px-6 py-6 lg:px-8">
          {/* The phone frame (631:14497) leads with a back arrow. */}
          <Link
            href="/groups"
            aria-label="Back to chapter groups"
            className="mr-1 shrink-0 text-ink-800 lg:hidden"
          >
            <svg viewBox="0 0 24 24" fill="none" className="size-6" aria-hidden="true">
              <path
                d="M19 12H5m0 0 6-6m-6 6 6 6"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
          <span
            className="grid size-8 shrink-0 place-items-center rounded-full text-primary-600"
            style={{ backgroundColor: group.color }}
          >
            <Glyph icon={group.icon} className="size-5" />
          </span>
          <h1 className="min-w-0 flex-1 truncate font-display text-2xl font-semibold text-ink-800">
            {group.title}
          </h1>
          {member && (
            <LeaveButton groupId={group.id} />
          )}
        </header>

        <div className="min-h-0 flex-1 scroll-slim overflow-y-auto px-4 py-6 lg:px-8">
          <div className="mx-auto flex w-full max-w-[724px] flex-col gap-8 pb-10">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                {group.description && (
                  <p className="font-sans text-base whitespace-pre-line text-ink-500">{group.description}</p>
                )}
                <div className="flex flex-wrap items-center gap-1">
                  <span className="flex">
                    {group.memberAvatars.map((src, i) => (
                      <span
                        key={`${src}-${i}`}
                        className="rounded-full border-2 border-surface"
                        style={{ marginLeft: i === 0 ? 0 : -6 }}
                      >
                        <Avatar src={src} name="" sizes="24px" className="size-5" />
                      </span>
                    ))}
                  </span>
                  <span className="ml-2 font-sans text-xs text-ink-400">
                    {group.memberCount} in this chapter&rsquo;s group chat
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {group.label && (
                    <span className="flex w-fit items-center gap-1 rounded-full bg-ivory-500 px-2 py-1">
                      <span className="size-1.5 rounded-full bg-primary-600" />
                      <span className="font-sans text-xs font-medium text-ink-400">{group.label}</span>
                    </span>
                  )}
                  {group.chapterSlug && (
                    <span className="w-fit rounded-full bg-ivory-500 px-2 py-1 font-sans text-xs font-medium text-ink-400">
                      {getChapter(group.chapterSlug)?.name}
                    </span>
                  )}
                </div>
              </div>

              {admin ? (
                <>
                  {/* Frame 205:9937 — admins skip the request card entirely. */}
                  <div className="flex gap-3 rounded-2xl bg-primary-50 p-4">
                    <LockIcon />
                    <div className="flex flex-col gap-2">
                      <span className="font-sans text-lg font-semibold text-primary-500">
                        Admin access
                      </span>
                      <p className="font-sans text-base text-primary-500">
                        You&rsquo;re joined to this conversation as an admin.
                        Full conversation below
                      </p>
                    </div>
                  </div>
                  {requests.length > 0 && <JoinRequests requests={requests} />}
                </>
              ) : member ? null : requested ? (
                /* Frame 222:13844 — the sent confirmation. */
                <section className="flex flex-col items-center gap-2 rounded-2xl bg-surface px-6 py-8 text-center">
                  <span className="grid size-10 place-items-center rounded-full bg-primary-50 text-primary-600">
                    <CheckIcon />
                  </span>
                  <h2 className="font-display text-2xl font-semibold text-ink-700">
                    Request sent
                  </h2>
                  <p className="font-sans text-base text-ink-400">
                    An admin will review it. No rush, no ranking.
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      startJoining(async () => {
                        await withdrawJoinRequest(group.id);
                        setRequested(false);
                      })
                    }
                    className="font-sans text-sm text-ink-300 hover:underline"
                  >
                    Withdraw request
                  </button>
                </section>
              ) : (
                <section className="flex flex-col gap-6 rounded-2xl bg-surface px-6 py-6 lg:px-8">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <h2 className="font-display text-2xl font-semibold text-ink-700">
                      {group.joinPolicy === "open" ? "Join this chapter" : "Request to join this chapter"}
                    </h2>
                    <p className="font-sans text-base text-ink-400">
                      {group.joinPolicy === "open"
                        ? "Anyone can join this group."
                        : "An admin reviews every chapter"}
                    </p>
                  </div>
                  <div className="border-t border-ink-50 pt-6">
                    <button
                      type="button"
                      disabled={joining}
                      onClick={() =>
                        startJoining(async () => {
                          const result = await joinGroup(group.id);
                          if (result.error) {
                            toast({ title: result.error, tone: "danger" });
                            return;
                          }
                          if (result.status === "requested") setRequested(true);
                          else toast({ title: `You joined ${group.title}` });
                        })
                      }
                      className="w-full rounded-full bg-primary-500 px-6 py-2.5 font-ui text-sm text-white transition-colors hover:bg-primary-400 disabled:opacity-60"
                    >
                      {group.joinPolicy === "open" ? "Join group" : "Send join request"}
                    </button>
                  </div>
                </section>
              )}

              <div role="tablist" className="flex">
                {TABS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    role="tab"
                    aria-selected={t === tab}
                    onClick={() => setTab(t)}
                    className={cn(
                      "h-10 flex-1 border-b-2 px-4 py-2 font-sans text-sm font-medium transition-colors",
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

            {!member ? (
              <p className="rounded-2xl bg-surface px-6 py-8 text-center font-sans text-sm text-ink-300">
                Members can read the {tab === "Conversation" ? "conversation" : tab === "Truth Board" ? "Truth Board" : "video truths"}.
              </p>
            ) : tab === "Conversation" ? (
              <RoomMessageList messages={chat.messages} empty="No one has said anything yet. Start the conversation." />
            ) : tab === "Truth Board" ? (
              <TruthBoard groupId={group.id} truths={truths} />
            ) : (
              <VideoTruths groupId={group.id} videos={videos} />
            )}
          </div>
        </div>

        {member && tab === "Conversation" && (
          /* Frame 222:13512 — the comment bar. */
          <div className="shrink-0 border-t border-ink-50 bg-surface px-4 py-5 lg:px-8">
            <RoomComposer placeholder="Add a comment......" onSend={chat.send} sending={chat.sending} />
          </div>
        )}
      </div>

      <SuggestedRail />
    </div>
  );
}

function LeaveButton({ groupId }: { groupId: string }) {
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="shrink-0 rounded-full px-3 py-2 font-ui text-sm text-ink-300 hover:bg-ivory-100"
      >
        Leave
      </button>
    );
  }

  return (
    <span className="flex shrink-0 items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await leaveGroup(groupId);
            if (result.error) toast({ title: result.error, tone: "danger" });
            else toast({ title: "You left the group" });
            setConfirming(false);
          })
        }
        className="rounded-full bg-destructive-60 px-3 py-2 font-ui text-sm text-white disabled:opacity-60"
      >
        Leave group
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="rounded-full px-3 py-2 font-ui text-sm text-ink-400"
      >
        Cancel
      </button>
    </span>
  );
}

function JoinRequests({ requests }: { requests: JoinRequest[] }) {
  const toast = useToast();
  const [handled, setHandled] = useState<Record<string, string>>({});

  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-surface p-5">
      <h2 className="font-sans text-base text-ink-400">JOIN REQUESTS</h2>
      <ul className="flex flex-col gap-3">
        {requests.map((request) => (
          <li key={request.id} className="flex flex-wrap items-center justify-between gap-3">
            <span className="flex items-center gap-3">
              <Avatar src={request.avatarUrl} name={request.name} className="size-10" />
              <span className="flex flex-col">
                <span className="font-sans text-base font-medium text-ink-700">{request.name}</span>
                <span className="font-sans text-xs text-ink-300" suppressHydrationWarning>
                  {timeAgo(request.createdAt)}
                </span>
              </span>
            </span>
            {handled[request.id] ? (
              <span className="font-sans text-sm text-ink-300">{handled[request.id]}</span>
            ) : (
              <span className="flex gap-2">
                {[true, false].map((approve) => (
                  <button
                    key={String(approve)}
                    type="button"
                    onClick={async () => {
                      const result = await reviewJoinRequest(request.id, approve);
                      if (result.error) {
                        toast({ title: result.error, tone: "danger" });
                        return;
                      }
                      setHandled((prev) => ({ ...prev, [request.id]: approve ? "Approved" : "Declined" }));
                    }}
                    className={cn(
                      "rounded-full px-4 py-2 font-ui text-sm font-medium transition-colors",
                      approve
                        ? "bg-primary-500 text-white hover:bg-primary-400"
                        : "bg-primary-50 text-primary-800 hover:bg-primary-100",
                    )}
                  >
                    {approve ? "Approve" : "Decline"}
                  </button>
                ))}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function TruthBoard({ groupId, truths: initial }: { groupId: string; truths: Truth[] }) {
  const toast = useToast();
  const [truths, setTruths] = useState(initial);
  const [draft, setDraft] = useState("");
  const [posting, startPosting] = useTransition();

  const toggleFelt = async (truth: Truth) => {
    const next = !truth.feltByMe;
    const update = (felt: boolean, delta: number) =>
      setTruths((prev) =>
        prev.map((t) => (t.id === truth.id ? { ...t, feltByMe: felt, feltCount: t.feltCount + delta } : t)),
      );
    update(next, next ? 1 : -1);
    const result = await setFelt(truth.id, next);
    if (result.error) {
      update(!next, next ? -1 : 1);
      toast({ title: result.error, tone: "danger" });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-sans text-base text-ink-400">TRUTH BOARD</h2>

      {/* Frame 48097631 — the anonymous prompt. */}
      <form
        className="flex flex-col gap-4 rounded-2xl bg-surface p-5"
        onSubmit={(e) => {
          e.preventDefault();
          const body = draft.trim();
          if (!body) return;
          startPosting(async () => {
            const result = await postTruth(groupId, `I don’t know who needs to hear this, but… ${body}`);
            if (result.error) {
              toast({ title: result.error, tone: "danger" });
              return;
            }
            setDraft("");
            toast({ title: "Posted anonymously" });
          });
        }}
      >
        <p className="font-sans text-base text-ink-500">
          I don&rsquo;t know who needs to hear this, but......
        </p>
        <div className="flex items-center gap-4">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={900}
            placeholder="Finish this sentence anonymously"
            className="min-w-0 flex-1 rounded-lg bg-ivory-100 px-4 py-4 font-sans text-sm text-ink-500 outline-none placeholder:text-ink-200 focus:shadow-[0px_0px_0px_4px_rgba(249,189,152,0.25)]"
          />
          <button
            type="submit"
            disabled={!draft.trim() || posting}
            aria-label="Post anonymously"
            className="grid size-12 shrink-0 place-items-center rounded-full bg-primary-500 text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <SendIcon />
          </button>
        </div>
      </form>

      {truths.length === 0 ? (
        <p className="py-4 text-center font-sans text-sm text-ink-300">No truths yet. Be the first.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {truths.map((truth) => (
            <li key={truth.id} className="flex flex-col gap-4 rounded-2xl bg-surface p-5">
              <p className="font-sans text-base whitespace-pre-line text-ink-500">{truth.body}</p>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="flex items-center gap-2 font-sans text-xs text-ink-300">
                  {truth.mine ? "You, anonymously" : "Someone in this chapter"}
                  <span className="size-1 rounded-full bg-ink-100" />
                  <span suppressHydrationWarning>{timeAgo(truth.createdAt)}</span>
                  {truth.mine && (
                    <button
                      type="button"
                      onClick={async () => {
                        const result = await deleteTruth(truth.id);
                        if (result.error) toast({ title: result.error, tone: "danger" });
                        else setTruths((prev) => prev.filter((t) => t.id !== truth.id));
                      }}
                      className="text-destructive-60 hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => toggleFelt(truth)}
                  aria-pressed={truth.feltByMe}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-2 py-1 font-sans text-xs transition-colors",
                    truth.feltByMe ? "bg-primary-50 text-primary-600" : "text-ink-300 hover:bg-ivory-100",
                  )}
                >
                  <BoltIcon />
                  {truth.feltCount === 1 ? "1 person felt this" : `${truth.feltCount} people felt this`}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function VideoTruths({ groupId, videos: initial }: { groupId: string; videos: VideoTruth[] }) {
  const viewer = useViewer();
  const toast = useToast();
  const [videos, setVideos] = useState(initial);
  const [uploading, setUploading] = useState(false);
  const [expanded, setExpanded] = useState<VideoTruth | null>(null);

  const upload = async (file: File) => {
    if (!file.type.startsWith("video/")) return toast({ title: "Choose a video file", tone: "danger" });
    if (file.size > UPLOAD_LIMITS.videoBytes) return toast({ title: "Choose a video under 100MB", tone: "danger" });

    setUploading(true);
    const duration = await mediaDuration(file, "video");
    const uploaded = await uploadFile("media", viewer.id, file, { prefix: "truth-", fallbackExtension: "mp4" });
    if ("error" in uploaded) {
      setUploading(false);
      return toast({ title: uploaded.error, tone: "danger" });
    }
    const result = await addVideoTruth(groupId, uploaded.path, duration);
    setUploading(false);
    if (result.error) {
      removeUploads("media", [uploaded.path]);
      return toast({ title: result.error, tone: "danger" });
    }
    toast({ title: "Video truth added" });
  };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-sans text-base text-ink-400">VIDEO TRUTHS</h2>

      <div className="flex flex-col gap-4 rounded-2xl bg-surface p-5">
        <p className="font-sans text-base text-ink-500">
          I don&rsquo;t know who needs to hear this, but...... said out loud
        </p>
        {/* "upload: drag upload" — dashed primary border on primary-50.
            `relative` keeps the sr-only input inside this box. */}
        <label className="relative flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-primary-600 bg-primary-50 p-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-100 text-primary-600">
            <VideoIcon />
          </span>
          <span className="flex flex-col">
            <span className="font-sans text-sm font-medium text-primary-600">
              {uploading ? "Uploading your video…" : "Record a video truth"}
            </span>
            <span className="font-sans text-xs text-primary-600">
              Same theme, said out loud
            </span>
          </span>
          <input
            type="file"
            accept="video/*"
            capture="user"
            className="sr-only"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void upload(file);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      {videos.length === 0 ? (
        <p className="py-4 text-center font-sans text-sm text-ink-300">No video truths yet.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-3">
          {videos.map((video) => (
            <li key={video.id} className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-ink-900">
              {/* Full screen would stretch a portrait clip; Expand opens it
                  larger in its own shape instead. */}
              <video
                src={video.src}
                controls
                playsInline
                preload="metadata"
                controlsList="nofullscreen"
                disablePictureInPicture
                className="absolute inset-0 size-full object-cover"
              />
              <button
                type="button"
                onClick={() => setExpanded(video)}
                aria-label="Expand video"
                className="absolute right-3 bottom-14 grid size-8 place-items-center rounded-full bg-ink-900/60 text-white transition-colors hover:bg-ink-900/80"
              >
                <svg viewBox="0 0 16 16" fill="none" className="size-4" aria-hidden="true">
                  <path d="M9.5 2.5h4v4M6.5 13.5h-4v-4M13.5 2.5 9 7M2.5 13.5 7 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {video.durationSeconds !== null && (
                <span className="pointer-events-none absolute top-3 right-3 rounded-full bg-ink-900/60 px-3 py-1 font-sans text-xs text-white">
                  {formatSeconds(video.durationSeconds).replace(/^0/, "")}
                </span>
              )}
              <span className="pointer-events-none absolute top-3 left-3 rounded-full bg-ink-900/60 px-3 py-1 font-sans text-xs text-white">
                {video.mine ? "You" : video.authorName}
              </span>
              {video.mine && (
                <button
                  type="button"
                  onClick={async () => {
                    const result = await deleteVideoTruth(video.id);
                    if (result.error) toast({ title: result.error, tone: "danger" });
                    else setVideos((prev) => prev.filter((v) => v.id !== video.id));
                  }}
                  className="absolute right-14 bottom-14 rounded-full bg-ink-900/60 px-3 py-1 font-sans text-xs text-white"
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {expanded && (
        <VideoViewer
          src={expanded.src}
          label={`${expanded.mine ? "Your" : `${expanded.authorName}'s`} video truth`}
          onClose={() => setExpanded(null)}
        />
      )}
    </div>
  );
}

function Glyph({ icon, className }: { icon: string; className?: string }) {
  return (
    <span
      className={cn("bg-current", className)}
      style={{
        maskImage: `url(/icons/events/${icon}.svg)`,
        WebkitMaskImage: `url(/icons/events/${icon}.svg)`,
        maskSize: "contain",
        WebkitMaskSize: "contain",
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskPosition: "center",
        WebkitMaskPosition: "center",
      }}
    />
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-6" aria-hidden="true">
      <path d="m5 12.5 5 5 9-11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BoltIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="size-4" aria-hidden="true">
      <path d="M9 1.5 3.5 9H8l-1 5.5L12.5 7H8l1-5.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}

function VideoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-5" aria-hidden="true">
      <rect x="3" y="6" width="13" height="12" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M16 11.5 21 9v6l-5-2.5v-1Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" className="size-8 shrink-0 text-primary-500" aria-hidden="true">
      <rect x="7" y="14" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M11 14v-3a5 5 0 0 1 10 0v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-5" aria-hidden="true">
      <path d="M4 12 20 4l-8 16-2-6-6-2Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}
