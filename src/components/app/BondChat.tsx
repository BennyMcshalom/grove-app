"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useTransition } from "react";
import { Avatar } from "@/components/app/Avatar";
import { useIsOnline } from "@/components/app/Presence";
import { useToast } from "@/components/app/ToastProvider";
import { useCalls } from "@/components/app/CallProvider";
import { useViewer } from "@/components/app/ViewerProvider";
import { formatSeconds, VoiceRecorder } from "@/components/app/VoiceRecorder";
import {
  ensureConversation,
  loadMessage,
  loadMessages,
  markConversationRead,
  sendMediaMessage,
  sendMessage,
} from "@/lib/bond-actions";
import { bondDuration, messagePreview, type BondPerson, type ChatMessage } from "@/lib/bonds";
import { getChapter } from "@/lib/chapters";
import { cn } from "@/lib/cn";
import { createClient } from "@/lib/supabase/client";
import { mediaDuration, uploadFile, UPLOAD_LIMITS } from "@/lib/upload";

/**
 * Chat pane — Figma frame 452:10373.
 *
 * 525px column: an ivory-300 top nav carrying the bond's depth bar, a
 * scrolling message list, and a pill composer. New messages and read receipts
 * arrive over Realtime. Text, photos, videos and voice notes can be sent, and
 * the header's phone and video icons place calls (CallProvider).
 */
export function BondChat({
  person,
  onBack,
  onActivity,
}: {
  person: BondPerson;
  /** The phone chat (635:19212) leads with a back arrow to the list. */
  onBack?: () => void;
  /** Keeps the conversation list's preview, unread count and id current. */
  onActivity?: (update: {
    conversationId: string;
    lastMessage?: BondPerson["lastMessage"];
    read?: boolean;
  }) => void;
}) {
  const viewer = useViewer();
  const toast = useToast();
  const online = useIsOnline(person.userId);
  const calls = useCalls();

  // Header phone / video icons. A first call opens the conversation, like a first message.
  const call = async (kind: "audio" | "video") => {
    const opened = await ensureConversation(person.userId, conversationId);
    if (opened.error || !opened.conversationId) {
      toast({ title: opened.error ?? "We couldn't start this conversation.", tone: "danger" });
      return;
    }
    if (!conversationId) setConversationId(opened.conversationId);
    await calls.startCall(opened.conversationId, kind, {
      userId: person.userId,
      name: person.name,
      avatarUrl: person.avatarUrl,
    });
  };

  const [conversationId, setConversationId] = useState(person.conversationId);
  const [messages, setMessages] = useState<ChatMessage[] | null>(person.conversationId ? null : []);
  const [otherReadAt, setOtherReadAt] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, startSending] = useTransition();
  const listRef = useRef<HTMLDivElement>(null);

  // Callbacks from the parent change every render; effects read the latest.
  const onActivityRef = useRef(onActivity);
  useEffect(() => {
    onActivityRef.current = onActivity;
  });

  // Load the conversation, then mark it read.
  useEffect(() => {
    if (!conversationId) return;
    let cancelled = false;
    loadMessages(conversationId).then((result) => {
      if (cancelled) return;
      if (result.error) toast({ title: result.error, tone: "danger" });
      setMessages(result.messages);
      setOtherReadAt(result.otherReadAt);
      void markConversationRead(conversationId);
      onActivityRef.current?.({ conversationId, read: true });
    });
    return () => {
      cancelled = true;
    };
  }, [conversationId, toast]);

  // Live: their new messages, and their read marker for "Read" receipts.
  useEffect(() => {
    if (!conversationId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        async (payload) => {
          const row = payload.new as { id: string; sender_id: string | null; kind: ChatMessage["kind"]; body: string | null; created_at: string };
          if (row.sender_id === viewer.id) return; // Already added when sent.

          const message: ChatMessage | null =
            row.kind === "text" || row.kind === "system"
              ? { id: row.id, kind: row.kind, fromMe: false, body: row.body, createdAt: row.created_at }
              : await loadMessage(row.id);
          if (!message) return;

          setMessages((prev) => (prev?.some((m) => m.id === message.id) ? prev : [...(prev ?? []), message]));
          void markConversationRead(conversationId);
          onActivityRef.current?.({
            conversationId,
            read: true,
            lastMessage: { preview: messagePreview(message.kind, message.body), at: message.createdAt, fromMe: false },
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "conversation_members", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const row = payload.new as { user_id: string; last_read_at: string | null };
          if (row.user_id !== viewer.id) setOtherReadAt(row.last_read_at);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, viewer.id]);

  // Keep the newest message in view.
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages]);

  const send = () => {
    const body = draft.trim();
    if (!body || sending) return;
    setDraft("");
    startSending(async () => {
      const result = await sendMessage(person.userId, conversationId, body);
      if (result.error || !result.message || !result.conversationId) {
        setDraft(body);
        toast({ title: result.error ?? "Your message didn't send.", tone: "danger" });
        return;
      }
      const message = result.message;
      setMessages((prev) => [...(prev ?? []), message]);
      if (!conversationId) setConversationId(result.conversationId);
      onActivityRef.current?.({
        conversationId: result.conversationId,
        lastMessage: { preview: messagePreview(message.kind, message.body), at: message.createdAt, fromMe: true },
      });
    });
  };

  const [attaching, setAttaching] = useState(false);

  // Attachments upload straight to chat/<conversation>/<me>/, then send.
  const attach = async (file: Blob, kind: "voice" | "video" | "image", seconds?: number) => {
    const limit =
      kind === "image" ? UPLOAD_LIMITS.photoBytes : kind === "video" ? UPLOAD_LIMITS.videoBytes : UPLOAD_LIMITS.audioBytes;
    if (file.size > limit) {
      toast({ title: kind === "image" ? "Choose a photo under 10MB" : "That file is too large", tone: "danger" });
      return;
    }

    setAttaching(true);
    const opened = await ensureConversation(person.userId, conversationId);
    if (opened.error || !opened.conversationId) {
      setAttaching(false);
      toast({ title: opened.error ?? "We couldn't start this conversation.", tone: "danger" });
      return;
    }
    const conversation = opened.conversationId;
    if (!conversationId) setConversationId(conversation);

    const duration = kind === "video" ? await mediaDuration(file, "video") : (seconds ?? null);
    const uploaded = await uploadFile("chat", `${conversation}/${viewer.id}`, file, {
      fallbackExtension: kind === "voice" ? "webm" : kind === "video" ? "mp4" : "jpg",
    });
    if ("error" in uploaded) {
      setAttaching(false);
      toast({ title: uploaded.error, tone: "danger" });
      return;
    }

    const result = await sendMediaMessage(conversation, kind, uploaded.path, duration);
    setAttaching(false);
    if (result.error || !result.message) {
      toast({ title: result.error ?? "That didn't send.", tone: "danger" });
      return;
    }
    const message = result.message;
    setMessages((prev) => [...(prev ?? []), message]);
    onActivityRef.current?.({
      conversationId: conversation,
      lastMessage: { preview: messagePreview(message.kind, message.body), at: message.createdAt, fromMe: true },
    });
  };

  const groups = groupByDay(messages ?? []);

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col border-l border-ink-50">
      <header className="flex shrink-0 flex-col gap-2 border-b border-ink-50 bg-ivory-300 px-5 py-3">
        <div className="flex items-center gap-3.5">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="Back to bonds"
              className="shrink-0 text-ink-800 md:hidden"
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
            </button>
          )}
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <GlowAvatar src={person.avatarUrl} name={person.name} online={online} />
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate font-sans text-base font-medium text-ink-700">
                {person.name}
              </span>
              {person.phase && <ChapterBadge chapterSlug={person.chapterSlug} label={person.phase} />}
            </div>
          </div>

          <div className="flex items-center gap-2 text-ink-400">
            <IconButton label="Call" ringed onClick={calls.enabled ? () => void call("audio") : undefined}>
              <PhoneIcon />
            </IconButton>
            <IconButton label="Video call" ringed onClick={calls.enabled ? () => void call("video") : undefined}>
              <VideoIcon />
            </IconButton>
            <IconButton label="More" ringed><DotsIcon /></IconButton>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="font-sans text-sm font-medium text-ink-300">
            {person.relationship === "bond" ? "Bond Depth" : "In your circle"}
          </span>
          <span className="h-1 w-full max-w-[320px] overflow-hidden rounded-full bg-ink-50">
            <span
              className="block h-full rounded-full bg-primary-600"
              style={{ width: `${person.depth}%` }}
            />
          </span>
          <span className="shrink-0 font-sans text-sm font-medium text-ink-300">
            {bondDuration(person.since)}
          </span>
        </div>
      </header>

      <div ref={listRef} className="flex min-h-0 flex-1 flex-col gap-4 scroll-slim overflow-y-auto p-5">
        {messages === null ? (
          <p className="m-auto font-sans text-sm text-ink-300">Loading messages…</p>
        ) : messages.length === 0 ? (
          <p className="m-auto text-center font-sans text-sm text-ink-300">
            Say hello to {person.name}.
          </p>
        ) : (
          groups.map((group) => (
            <div key={group.key} className="flex flex-col gap-4">
              {group.label === "Today" ? (
                <div className="flex items-center gap-2">
                  <span className="h-px flex-1 bg-ink-50" />
                  <span className="font-sans text-sm font-semibold text-ink-300">Today</span>
                  <span className="h-px flex-1 bg-ink-50" />
                </div>
              ) : (
                <p className="text-center font-sans text-sm font-medium text-ink-300">{group.label}</p>
              )}

              <div className="flex flex-col gap-3">
                {group.messages.map((m) => (
                  <Bubble
                    key={m.id}
                    message={m}
                    person={person}
                    read={Boolean(otherReadAt && otherReadAt >= m.createdAt)}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="shrink-0 p-5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex items-center gap-4 rounded-full border border-ink-50 bg-white p-3 shadow-[0px_2px_4px_-2px_rgba(23,23,23,0.06),0px_4px_8px_-2px_rgba(23,23,23,0.1)]"
        >
          <label
            className={cn(
              "relative grid size-8 shrink-0 cursor-pointer place-items-center rounded-full text-ink-400 transition-colors hover:bg-ivory-200",
              attaching && "animate-pulse",
            )}
          >
            <PlusIcon />
            <span className="sr-only">Attach a photo or video</span>
            <input
              type="file"
              accept="image/*,video/*"
              className="sr-only"
              disabled={attaching}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void attach(file, file.type.startsWith("video/") ? "video" : "image");
                e.target.value = "";
              }}
            />
          </label>
          <label className="min-w-0 flex-1">
            <span className="sr-only">Message {person.name}</span>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={4000}
              placeholder="Write your message..."
              className="w-full bg-transparent font-sans text-base text-ink-500 outline-none placeholder:text-ink-500"
            />
          </label>
          <div className="flex shrink-0 items-center gap-1 text-ink-400">
            <VoiceRecorder
              compact
              label="Record voice note"
              disabled={attaching}
              onRecorded={(audio, seconds) => void attach(audio, "voice", seconds)}
            />
            <button
              type="submit"
              aria-label="Send"
              disabled={!draft.trim() || sending}
              className="grid size-8 place-items-center rounded-full transition-colors hover:bg-ivory-200 disabled:opacity-40"
            >
              <SendIcon />
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

const dayLabel = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "long" });
const clock = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" });

/** Messages under "Today", "Yesterday" or "25 April". */
function groupByDay(messages: ChatMessage[]) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const groups: { key: string; label: string; messages: ChatMessage[] }[] = [];
  for (const message of messages) {
    const date = new Date(message.createdAt);
    const key = date.toDateString();
    const label =
      key === today.toDateString() ? "Today" : key === yesterday.toDateString() ? "Yesterday" : dayLabel.format(date);
    const last = groups.at(-1);
    if (last?.key === key) last.messages.push(message);
    else groups.push({ key, label, messages: [message] });
  }
  return groups;
}

function Bubble({
  message,
  person,
  read,
}: {
  message: ChatMessage;
  person: BondPerson;
  read: boolean;
}) {
  const mine = message.fromMe;
  const time = clock.format(new Date(message.createdAt));

  if (message.kind === "system") {
    return <p className="text-center font-sans text-xs text-ink-300">{message.body}</p>;
  }

  return (
    <div className={cn("flex gap-2", mine ? "justify-end" : "justify-start")}>
      {!mine && (
        <Avatar src={person.avatarUrl} name={person.name} className="size-10 self-end" />
      )}

      <div className={cn("flex max-w-[334px] flex-col gap-1", mine && "items-end")}>
        {message.kind === "post_share" ? (
          <div
            className={cn(
              "flex flex-col gap-1 rounded-2xl p-3",
              mine ? "bg-primary-600 text-ink-0" : "border border-ink-50 bg-white text-ink-700",
            )}
          >
            <span className={cn("font-sans text-xs font-semibold", mine ? "text-primary-50" : "text-ink-300")}>
              Shared a post
              {message.sharedPost && ` · ${getChapter(message.sharedPost.chapterSlug)?.name ?? ""}`}
            </span>
            {message.sharedPost ? (
              <>
                {message.sharedPost.title && (
                  <span className="font-sans text-sm font-semibold">{message.sharedPost.title}</span>
                )}
                {message.sharedPost.body && (
                  <span className="line-clamp-3 font-sans text-sm">{message.sharedPost.body}</span>
                )}
              </>
            ) : (
              <span className="font-sans text-sm opacity-80">
                This post is in a space you don&rsquo;t hold.
              </span>
            )}
            <span className={cn("self-end font-sans text-xs font-medium", mine ? "text-primary-50" : "text-ink-500")}>
              {time}
            </span>
          </div>
        ) : message.kind === "voice" && message.mediaUrl ? (
          <div
            className={cn(
              "flex flex-col gap-2 rounded-2xl p-3",
              mine ? "bg-primary-600 text-ink-0" : "border border-ink-50 bg-white text-ink-700",
            )}
          >
            <audio controls preload="none" src={message.mediaUrl} className="h-10 w-60 max-w-full" />
            <div className="flex w-full items-center justify-between gap-4">
              <span className="font-sans text-xs font-bold">
                {message.durationSeconds ? formatSeconds(message.durationSeconds) : "Voice note"}
              </span>
              <span className={cn("font-sans text-xs font-medium", mine ? "text-primary-50" : "text-ink-500")}>
                {time}
              </span>
            </div>
          </div>
        ) : (message.kind === "video" || message.kind === "image") && message.mediaUrl ? (
          <div className="flex flex-col gap-1 rounded-2xl border border-ink-50 bg-white p-1">
            <div className="relative overflow-hidden rounded-xl">
              {message.kind === "video" ? (
                <video controls playsInline preload="metadata" src={message.mediaUrl} className="max-h-80 w-full bg-ink-900" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- signed links expire; skip the optimiser
                <img src={message.mediaUrl} alt="" className="max-h-80 w-full object-cover" />
              )}
            </div>
            <span className="px-2 pb-1 text-right font-sans text-xs font-medium text-ink-500">
              {time}
            </span>
          </div>
        ) : (
          <div
            className={cn(
              "flex items-end gap-2.5 rounded-2xl p-3",
              mine
                ? "bg-primary-600 text-ink-0"
                : "border border-ink-50 bg-white text-ink-700",
            )}
          >
            <p className="font-sans text-sm font-medium whitespace-pre-line">
              {message.kind === "text" ? message.body : messagePreview(message.kind, message.body)}
            </p>
            <span
              className={cn(
                "shrink-0 font-sans text-xs font-medium",
                mine ? "text-primary-50" : "text-ink-500",
              )}
            >
              {time}
            </span>
          </div>
        )}

        {mine && (
          <span className="flex items-center gap-1 font-sans text-xs font-semibold text-ink-500">
            <CheckIcon className="size-4" />
            {read ? "Read" : "Sent"}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Chapter badge — Figma frame 452:10382. ivory-200 pill, 4/12 padding, a 20px
 * chapter illustration beside the member's current phase in ivory-900.
 */
export function ChapterBadge({
  chapterSlug,
  label,
}: {
  chapterSlug?: string | null;
  label: string;
}) {
  const icon = chapterSlug ? getChapter(chapterSlug)?.icon : undefined;
  return (
    <span className="flex w-fit items-center gap-1.5 rounded-full bg-ivory-200 px-2 py-0.5">
      {icon && (
        <Image src={icon} alt="" width={20} height={20} className="size-4 shrink-0 rounded-full" />
      )}
      <span className="truncate font-sans text-xs font-medium text-ivory-900">
        {label}
      </span>
    </span>
  );
}

/** Avatar with the amber ring + glow Figma gives bond members. */
export function GlowAvatar({
  src,
  name,
  online = false,
  size = 40,
}: {
  src: string | null;
  name: string;
  online?: boolean;
  size?: number;
}) {
  return (
    <span
      className="relative shrink-0 rounded-full"
      style={{
        width: size,
        height: size,
        boxShadow: "0px 2px 6px 5px rgba(251, 148, 31, 0.4)",
      }}
    >
      <Avatar src={src} name={name} sizes={`${size}px`} className="size-full" />
      {online && (
        <span className="absolute right-0 bottom-0 size-3 rounded-full border-[1.5px] border-white bg-success-60" />
      )}
    </span>
  );
}

function IconButton({
  label,
  children,
  onClick,
  ringed = false,
}: {
  label: string;
  children: React.ReactNode;
  onClick?: () => void;
  /** The chat header's actions sit in outlined circles (452:10158). */
  ringed?: boolean;
}) {
  // Calls, capture and uploads need capabilities this build does not have, so
  // those controls say so rather than silently doing nothing.
  const unavailable = !onClick;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={unavailable ? `${label} — not available yet` : label}
      title={unavailable ? "Not available yet" : undefined}
      aria-disabled={unavailable || undefined}
      className={cn(
        "grid place-items-center rounded-full transition-colors",
        ringed ? "size-10 border border-ink-100 bg-white" : "size-8",
        unavailable
          ? "cursor-not-allowed opacity-40"
          : "hover:bg-ivory-200",
      )}
    >
      {children}
    </button>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-5" aria-hidden="true">
      <path
        d="M7 3.5 9 8l-2 1.5a11 11 0 0 0 6 6L14.5 13l4.5 2v3.5a2 2 0 0 1-2.2 2A17 17 0 0 1 3.5 5.7 2 2 0 0 1 5.5 3.5H7Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function VideoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-5" aria-hidden="true">
      <rect x="3" y="6" width="12" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="m15 11 5-3v8l-5-3v-2Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function DotsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-5" aria-hidden="true">
      <circle cx="6" cy="12" r="1.7" />
      <circle cx="12" cy="12" r="1.7" />
      <circle cx="18" cy="12" r="1.7" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-5" aria-hidden="true">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
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

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path d="m1.5 8.5 3 3 6-6M9 11.5l1 1 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
