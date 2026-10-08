"use client";

import Image from "next/image";
import Link from "next/link";
import { MessagesSkeleton } from "@/components/ui/Skeleton";
import { Photo, Video } from "@/components/ui/Media";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { BondMark } from "@/components/app/BondMark";
import { BondBanner } from "@/components/app/bonds/BondBanner";
import { ConfirmDialog } from "@/components/app/bonds/ConfirmDialog";
import { PeoplePicker, type PickablePerson } from "@/components/app/bonds/PeoplePicker";
import { ChatMenu } from "@/components/app/ChatMenu";
import { ReportPostModal } from "@/components/app/PostModals";
import { Avatar } from "@/components/app/Avatar";
import { MentionInput, useMentionPicks } from "@/components/app/MentionInput";
import { MentionText, rememberMentions } from "@/components/app/MentionText";
import { useIsOnline } from "@/components/app/Presence";
import { useToast } from "@/components/app/ToastProvider";
import { useCalls } from "@/components/app/CallProvider";
import { useViewer } from "@/components/app/ViewerProvider";
import { formatSeconds, VoiceRecorder } from "@/components/app/VoiceRecorder";
import {
  deleteMessage,
  editMessage,
  ensureConversation,
  forwardMessage,
  listCardTargets,
  loadMessage,
  loadMessages,
  markConversationRead,
  sendMediaMessage,
  sendMessage,
} from "@/lib/bond-actions";
import { bondDuration, messagePreview, type BondPerson, type ChatMessage } from "@/lib/bonds";
import { getChapter } from "@/lib/chapters";
import { cn } from "@/lib/cn";
import type { Aura } from "@/lib/profile";
import { DOCUMENT_TYPES, formatBytes, isDocument, mediaDuration, uploadFile, UPLOAD_LIMITS } from "@/lib/upload";
import { useRealtimeChannel } from "@/lib/supabase/use-channel";

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
  // "@" in a one-to-one chat offers the other person.
  const picks = useMentionPicks();
  const mentionable = useMemo(
    () => ({
      kind: "people" as const,
      people: [{ id: person.userId, name: person.name, avatarUrl: person.avatarUrl, aura: person.aura ?? undefined }],
    }),
    [person.userId, person.name, person.avatarUrl, person.aura],
  );
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
  useRealtimeChannel(
    (supabase) =>
      !conversationId
        ? null
        : supabase
      .channel(`chat:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        async (payload) => {
          const row = payload.new as {
            id: string;
            sender_id: string | null;
            kind: ChatMessage["kind"];
            body: string | null;
            created_at: string;
            reply_to_id?: string | null;
          };
          if (row.sender_id === viewer.id) return; // Already added when sent.

          const message: ChatMessage | null =
            (row.kind === "text" || row.kind === "system") && !row.reply_to_id
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
        { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          // Edits and deletions, from them (or this account on another device).
          const row = payload.new as { id: string; body: string | null; edited_at: string | null; deleted_at: string | null };
          setMessages((prev) => prev?.map((m) => applyUpdate(m, row)) ?? prev);
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
      .subscribe(),
    [conversationId, viewer.id],
  );

  // Keep the newest message in view (edits and deletions don't jump the list).
  const messageCount = messages?.length ?? 0;
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messageCount]);

  // Per-message actions (Figma 1788:38139 mine / 1788:38148 theirs).
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [editing, setEditing] = useState<ChatMessage | null>(null);
  const [deleting, setDeleting] = useState<ChatMessage | null>(null);
  const [reporting, setReporting] = useState<ChatMessage | null>(null);
  const [forwarding, setForwarding] = useState<ChatMessage | null>(null);
  const [forwardTargets, setForwardTargets] = useState<PickablePerson[] | null>(null);
  const [forwardingTo, setForwardingTo] = useState<string | null>(null);
  const [deletingBusy, startDeleting] = useTransition();
  const inputWrap = useRef<HTMLLabelElement>(null);
  const focusInput = () => setTimeout(() => inputWrap.current?.querySelector("input")?.focus(), 0);

  const onAction = (action: MessageAction, message: ChatMessage) => {
    switch (action) {
      case "reply":
        setEditing(null);
        setReplyingTo(message);
        focusInput();
        break;
      case "edit":
        setReplyingTo(null);
        setEditing(message);
        setDraft(message.body ?? "");
        focusInput();
        break;
      case "copy":
        void navigator.clipboard
          ?.writeText(message.body ?? "")
          .then(() => toast({ title: "Copied", description: "Message text copied to your clipboard." }))
          .catch(() => toast({ title: "We couldn't copy that.", tone: "danger" }));
        break;
      case "forward":
        setForwarding(message);
        if (!forwardTargets) {
          void listCardTargets().then((people) =>
            setForwardTargets(people.filter((p) => p.userId !== person.userId)),
          );
        }
        break;
      case "delete":
        setDeleting(message);
        break;
      case "report":
        setReporting(message);
        break;
    }
  };

  const confirmDelete = () =>
    startDeleting(async () => {
      if (!deleting) return;
      const result = await deleteMessage(deleting.id);
      if (result.error) return void toast({ title: result.error, tone: "danger" });
      const row = { id: deleting.id, body: null, edited_at: null, deleted_at: new Date().toISOString() };
      setMessages((prev) => prev?.map((m) => applyUpdate(m, row)) ?? prev);
      if (editing?.id === deleting.id) cancelCompose();
      setDeleting(null);
      toast({ title: "Message deleted", description: "It's been removed for everyone in this conversation.", tone: "danger" });
    });

  const forwardTo = async (target: PickablePerson) => {
    if (!forwarding) return;
    setForwardingTo(target.userId);
    const result = await forwardMessage(forwarding.id, target.userId);
    setForwardingTo(null);
    if (result.error) return void toast({ title: result.error, tone: "danger" });
    setForwarding(null);
    toast({ title: "Message forwarded", description: `Sent to ${target.name}.` });
  };

  const cancelCompose = () => {
    if (editing) setDraft("");
    setEditing(null);
    setReplyingTo(null);
  };

  const saveEdit = (message: ChatMessage, body: string) => {
    if (body === (message.body ?? "").trim()) return cancelCompose();
    startSending(async () => {
      const result = await editMessage(message.id, body);
      if (result.error) return void toast({ title: result.error, tone: "danger" });
      setMessages(
        (prev) =>
          prev?.map((m) => applyUpdate(m, { id: message.id, body, edited_at: result.editedAt ?? null, deleted_at: null })) ??
          prev,
      );
      setEditing(null);
      setDraft("");
      toast({ title: "Message updated", description: "Your edit is now visible to everyone, marked as edited." });
    });
  };

  const send = () => {
    const body = draft.trim();
    if (!body || sending) return;
    if (editing) return saveEdit(editing, body);
    const reply = replyingTo;
    setDraft("");
    setReplyingTo(null);
    const mentioned = picks.peopleIn(body);
    picks.clear();
    startSending(async () => {
      const result = await sendMessage(person.userId, conversationId, body, mentioned.map((p) => p.id), reply?.id ?? null);
      if (result.error || !result.message || !result.conversationId) {
        setDraft(body);
        setReplyingTo(reply);
        mentioned.forEach(picks.add);
        toast({ title: result.error ?? "Your message didn't send.", tone: "danger" });
        return;
      }
      const message = result.message;
      rememberMentions("messages", message.id, mentioned);
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
  const attach = async (file: Blob, kind: "voice" | "video" | "image" | "file", seconds?: number) => {
    const limit =
      kind === "image"
        ? UPLOAD_LIMITS.photoBytes
        : kind === "video"
          ? UPLOAD_LIMITS.videoBytes
          : kind === "file"
            ? UPLOAD_LIMITS.documentBytes
            : UPLOAD_LIMITS.audioBytes;
    if (file.size > limit) {
      toast({
        title:
          kind === "image" ? "Choose a photo under 10MB" : kind === "file" ? "Documents can be up to 25MB" : "That file is too large",
        tone: "danger",
      });
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
      fallbackExtension: kind === "voice" ? "webm" : kind === "video" ? "mp4" : kind === "file" ? "bin" : "jpg",
    });
    if ("error" in uploaded) {
      setAttaching(false);
      toast({ title: uploaded.error, tone: "danger" });
      return;
    }

    const result = await sendMediaMessage(
      conversation,
      kind,
      uploaded.path,
      duration,
      kind === "file" ? { name: file instanceof File ? file.name : "Document", size: file.size } : undefined,
    );
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
            <GlowAvatar src={person.avatarUrl} name={person.name} online={online} aura={person.aura} />
            <div className="flex min-w-0 flex-col gap-0.5">
              <Link
                href={`/people/${person.userId}`}
                className="truncate font-sans text-base font-medium text-ink-700 hover:underline"
              >
                {person.name}
              </Link>
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
            <ChatMenu
              person={person}
              conversationId={conversationId}
              trigger={
                <span className="grid size-10 place-items-center rounded-full border border-ink-100 bg-surface transition-colors hover:bg-ivory-200">
                  <DotsIcon />
                </span>
              }
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {person.relationship === "bond" && <BondMark rank={person.rank} />}
          <span className="font-sans text-sm font-medium text-ink-300">
            {person.relationship === "bond" ? "Bond" : "In your circle"} · {bondDuration(person.since)}
          </span>
        </div>
      </header>

      <BondBanner person={person} />

      <div ref={listRef} className="flex min-h-0 flex-1 flex-col gap-4 scroll-slim overflow-y-auto p-5">
        {messages === null ? (
          <MessagesSkeleton />
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
                    onAction={(action) => onAction(action, m)}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex shrink-0 flex-col gap-2 p-5">
        {(editing || replyingTo) && (
          <div className="flex items-center gap-3 rounded-lg border-l-2 border-primary-500 bg-ivory-200 px-3 py-2">
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="font-sans text-xs font-semibold text-primary-700">
                {editing ? "Editing message" : `Replying to ${replyingTo?.fromMe ? "yourself" : person.name}`}
              </span>
              <span className="truncate font-sans text-sm text-ink-500">
                {editing ? editing.body : replyingTo ? messagePreview(replyingTo.kind, replyingTo.body) : ""}
              </span>
            </span>
            <button
              type="button"
              onClick={cancelCompose}
              aria-label={editing ? "Cancel edit" : "Cancel reply"}
              className="grid size-7 shrink-0 place-items-center rounded-full text-ink-500 hover:bg-ivory-300"
            >
              <svg viewBox="0 0 24 24" fill="none" className="size-4" aria-hidden="true">
                <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex items-center gap-4 rounded-full border border-ink-50 bg-surface p-3 shadow-[0px_2px_4px_-2px_rgba(23,23,23,0.06),0px_4px_8px_-2px_rgba(23,23,23,0.1)]"
        >
          <label
            className={cn(
              "relative grid size-8 shrink-0 cursor-pointer place-items-center rounded-full text-ink-400 transition-colors hover:bg-ivory-200",
              attaching && "animate-pulse",
            )}
          >
            <PlusIcon />
            <span className="sr-only">Attach a photo, video or document</span>
            <input
              type="file"
              accept={["image/*", "video/*", ...Object.keys(DOCUMENT_TYPES), ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"].join(",")}
              className="sr-only"
              disabled={attaching}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  if (isDocument(file)) void attach(file, "file");
                  else if (file.type.startsWith("video/")) void attach(file, "video");
                  else if (file.type.startsWith("image/")) void attach(file, "image");
                  else toast({ title: "Send photos, videos, PDFs or Office documents", tone: "danger" });
                }
                e.target.value = "";
              }}
            />
          </label>
          <label ref={inputWrap} className="min-w-0 flex-1">
            <span className="sr-only">Message {person.name}</span>
            <MentionInput
              as="input"
              value={draft}
              onChange={setDraft}
              context={mentionable}
              picks={picks}
              placement="above"
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
              aria-label={editing ? "Save edit" : "Send"}
              disabled={!draft.trim() || sending}
              className="grid size-8 place-items-center rounded-full transition-colors hover:bg-ivory-200 disabled:opacity-40"
            >
              <SendIcon />
            </button>
          </div>
        </form>
      </div>

      {/* "Delete this message?" — Figma 1776:27862, toast 1776:27893. */}
      {deleting && (
        <ConfirmDialog
          title="Delete this message?"
          action="Delete message"
          tone="danger"
          busy={deletingBusy}
          onConfirm={confirmDelete}
          onClose={() => setDeleting(null)}
        >
          This removes it for everyone in the conversation. They&rsquo;ll see &ldquo;This message was deleted&rdquo; in its
          place. This can&rsquo;t be undone.
        </ConfirmDialog>
      )}

      {reporting && (
        <ReportPostModal
          postId={reporting.id}
          targetType="message"
          quiet
          onClose={() => setReporting(null)}
          onReported={() => {
            setReporting(null);
            toast({ title: "Report submitted", description: "We'll review this message and follow up if needed." });
          }}
        />
      )}

      {forwarding && (
        <PeoplePicker
          title="Forward to"
          people={forwardTargets}
          busyId={forwardingTo}
          onPick={(target) => void forwardTo(target)}
          onClose={() => setForwarding(null)}
        />
      )}
    </section>
  );
}

type MessageAction = "reply" | "edit" | "forward" | "copy" | "delete" | "report";

/**
 * A message after an edit or a delete — and any reply quoting it, so its
 * quote follows along.
 */
function applyUpdate(
  message: ChatMessage,
  row: { id: string; body: string | null; edited_at: string | null; deleted_at: string | null },
): ChatMessage {
  if (message.id === row.id) {
    if (row.deleted_at) {
      const { id, kind, fromMe, createdAt } = message;
      return { id, kind, fromMe, body: null, createdAt, deleted: true };
    }
    return message.deleted ? message : { ...message, body: row.body, editedAt: row.edited_at };
  }
  if (message.replyTo?.id === row.id) {
    const preview = row.deleted_at ? "This message was deleted" : (row.body ?? message.replyTo.preview);
    return { ...message, replyTo: { ...message.replyTo, preview } };
  }
  return message;
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
  onAction,
}: {
  message: ChatMessage;
  person: BondPerson;
  read: boolean;
  onAction: (action: MessageAction) => void;
}) {
  const mine = message.fromMe;
  const time = clock.format(new Date(message.createdAt));

  if (message.kind === "system") {
    return <p className="text-center font-sans text-xs text-ink-300">{message.body}</p>;
  }

  if (message.deleted) {
    return (
      <div className={cn("flex gap-2", mine ? "justify-end" : "justify-start")}>
        {!mine && (
          <Avatar src={person.avatarUrl} name={person.name} userId={person.userId} className="size-10 self-end" />
        )}
        <p className="flex items-end gap-2.5 rounded-2xl border border-dashed border-ink-100 px-3 py-2.5 font-sans text-sm text-ink-300 italic">
          This message was deleted
          <span className="shrink-0 font-sans text-xs font-medium not-italic">{time}</span>
        </p>
      </div>
    );
  }

  // Your own: Edit, Forward, Reply, Copy text, Delete. Theirs: Reply, Copy text, Report.
  const hasText = message.kind === "text" && Boolean(message.body);
  const actions: { action: MessageAction; label: string; danger?: boolean }[] = mine
    ? [
        ...(hasText ? [{ action: "edit" as const, label: "Edit" }] : []),
        { action: "forward", label: "Forward" },
        { action: "reply", label: "Reply" },
        ...(hasText ? [{ action: "copy" as const, label: "Copy text" }] : []),
        { action: "delete", label: "Delete", danger: true },
      ]
    : [
        { action: "reply", label: "Reply" },
        ...(hasText ? [{ action: "copy" as const, label: "Copy text" }] : []),
        { action: "report", label: "Report", danger: true },
      ];
  const menu = <MessageMenu actions={actions} onAction={onAction} alignEnd={!mine} />;

  return (
    <div className={cn("group flex gap-2", mine ? "justify-end" : "justify-start")}>
      {!mine && (
        <Avatar src={person.avatarUrl} name={person.name} userId={person.userId} className="size-10 self-end" />
      )}
      {mine && menu}

      <div className={cn("flex min-w-0 max-w-[334px] flex-col gap-1", mine && "items-end")}>
        {message.replyTo && (
          <span
            className={cn(
              "flex max-w-full flex-col rounded-lg border-l-2 border-primary-300 bg-ivory-200 px-2.5 py-1.5",
              mine && "self-end",
            )}
          >
            <span className="font-sans text-xs font-semibold text-ink-500">
              {message.replyTo.fromMe ? "You" : person.name}
            </span>
            <span className="line-clamp-2 font-sans text-xs text-ink-400">{message.replyTo.preview}</span>
          </span>
        )}
        {message.kind === "post_share" ? (
          <div
            className={cn(
              "flex flex-col gap-1 rounded-2xl p-3",
              mine ? "bg-primary-600 text-white" : "border border-ink-50 bg-surface text-ink-700",
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
                This post isn&rsquo;t visible to you any more.
              </span>
            )}
            <span className={cn("self-end font-sans text-xs font-medium", mine ? "text-primary-50" : "text-ink-500")}>
              {time}
            </span>
          </div>
        ) : message.kind === "card" ? (
          <div
            className={cn(
              "flex flex-col gap-1 rounded-2xl p-3",
              mine ? "bg-primary-600 text-white" : "border border-ink-50 bg-surface text-ink-700",
            )}
          >
            <span className={cn("font-sans text-xs font-semibold", mine ? "text-primary-50" : "text-ink-300")}>
              {message.card?.kind === "wander" ? "A Wander card" : "A Curio card"}
            </span>
            {message.card ? (
              <>
                <span className="font-sans text-sm font-semibold">{message.card.title}</span>
                <span className="font-sans text-sm">{message.card.body}</span>
              </>
            ) : (
              <span className="font-sans text-sm opacity-80">This card is no longer available.</span>
            )}
            <span className={cn("self-end font-sans text-xs font-medium", mine ? "text-primary-50" : "text-ink-500")}>
              {time}
            </span>
          </div>
        ) : message.kind === "voice" && message.mediaUrl ? (
          <div
            className={cn(
              "flex flex-col gap-2 rounded-2xl p-3",
              mine ? "bg-primary-600 text-white" : "border border-ink-50 bg-surface text-ink-700",
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
        ) : message.kind === "file" && message.file ? (
          <a
            href={message.mediaUrl ?? undefined}
            download={message.file.name}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "flex items-center gap-3 rounded-2xl p-3 transition-opacity hover:opacity-90",
              mine ? "bg-primary-600 text-white" : "border border-ink-50 bg-surface text-ink-700",
              !message.mediaUrl && "pointer-events-none opacity-60",
            )}
          >
            <span
              className={cn(
                "grid size-10 shrink-0 place-items-center rounded-lg font-sans text-[10px] font-bold uppercase",
                mine ? "bg-white/20" : "bg-primary-50 text-primary-700",
              )}
            >
              {message.file.name.split(".").pop()?.slice(0, 4) ?? "doc"}
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="truncate font-sans text-sm font-semibold">{message.file.name}</span>
              <span className={cn("font-sans text-xs", mine ? "text-primary-50" : "text-ink-400")}>
                {message.file.size !== null ? `${formatBytes(message.file.size)} · ` : ""}Download · {time}
              </span>
            </span>
          </a>
        ) : (message.kind === "video" || message.kind === "image") && message.mediaUrl ? (
          <div className="flex flex-col gap-1 rounded-2xl border border-ink-50 bg-surface p-1">
            <div className="relative overflow-hidden rounded-xl">
              {message.kind === "video" ? (
                <Video controls playsInline preload="metadata" src={message.mediaUrl} className="max-h-80 w-full bg-ink-900" />
              ) : (
                <Photo src={message.mediaUrl} alt="" width={640} height={480} unoptimized className="max-h-80 w-full object-cover" />
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
                ? "bg-primary-600 text-white"
                : "border border-ink-50 bg-surface text-ink-700",
            )}
          >
            <p className="font-sans text-sm font-medium whitespace-pre-line">
              {message.kind === "text" && message.body ? (
                <MentionText
                  text={message.body}
                  source="messages"
                  id={message.id}
                  mentionClassName={mine ? "font-semibold text-white underline underline-offset-2" : undefined}
                />
              ) : (
                messagePreview(message.kind, message.body)
              )}
            </p>
            <span
              className={cn(
                "shrink-0 font-sans text-xs font-medium",
                mine ? "text-primary-50" : "text-ink-500",
              )}
            >
              {message.editedAt && "edited · "}
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
      {!mine && menu}
    </div>
  );
}

/**
 * The ⋮ beside a bubble (component set 1788:38348) and its menu. Shown on
 * hover or focus on desktop; always there, quietly, on touch screens.
 */
function MessageMenu({
  actions,
  onAction,
  alignEnd,
}: {
  actions: { action: MessageAction; label: string; danger?: boolean }[];
  onAction: (action: MessageAction) => void;
  alignEnd: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | TouchEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("touchstart", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("touchstart", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0 self-center">
      <button
        type="button"
        aria-label="Message actions"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "grid size-8 place-items-center rounded-full text-ink-400 transition-opacity hover:bg-ivory-200 hover:text-ink-700 focus-visible:opacity-100",
          open ? "opacity-100" : "opacity-60 md:opacity-0 md:group-hover:opacity-100",
        )}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="size-5" aria-hidden="true">
          <circle cx="12" cy="5.5" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="12" cy="18.5" r="1.8" />
        </svg>
      </button>
      {open && (
        <ul
          role="menu"
          className={cn(
            "absolute bottom-full z-30 mb-1 flex w-48 flex-col rounded-xl bg-surface p-1.5 shadow-[0px_8px_24px_0px_rgba(0,0,0,0.12)]",
            alignEnd ? "left-0" : "right-0",
          )}
        >
          {actions.map((item) => (
            <li key={item.action} role="none">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onAction(item.action);
                }}
                className={cn(
                  "w-full rounded-lg px-3 py-2.5 text-left font-sans text-sm transition-colors hover:bg-ivory-100",
                  item.danger ? "text-destructive-60" : "text-ink-700",
                )}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
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
    <span className="flex w-fit max-w-full items-center gap-1.5 rounded-full bg-ivory-200 px-2 py-0.5">
      {icon && (
        <Image src={icon} alt="" width={20} height={20} className="size-4 shrink-0 rounded-full" />
      )}
      <span className="truncate font-sans text-xs font-medium text-ivory-900">
        {label}
      </span>
    </span>
  );
}

/**
 * A bond member’s photo with their online dot. Natural (no glow); when their
 * aura is known it wears the aura status ring.
 */
export function GlowAvatar({
  src,
  name,
  online = false,
  size = 40,
  aura,
}: {
  src: string | null;
  name: string;
  online?: boolean;
  size?: number;
  aura?: Aura | null;
}) {
  return (
    <span className="relative shrink-0 rounded-full" style={{ width: size, height: size }}>
      <Avatar src={src} name={name} aura={aura} sizes={`${size}px`} className="size-full" />
      {online && (
        <span className="absolute right-0 bottom-0 size-3 rounded-full border-[1.5px] border-surface bg-success-60" />
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
        ringed ? "size-10 border border-ink-100 bg-surface" : "size-8",
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
