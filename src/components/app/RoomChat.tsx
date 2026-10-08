"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessagesSkeleton } from "@/components/ui/Skeleton";
import { Avatar } from "@/components/app/Avatar";
import { MentionInput, useMentionPicks } from "@/components/app/MentionInput";
import { MentionText, rememberMentions } from "@/components/app/MentionText";
import { ReportPostModal } from "@/components/app/PostModals";
import type { MentionPerson } from "@/lib/mentions";
import { useToast } from "@/components/app/ToastProvider";
import { useViewer } from "@/components/app/ViewerProvider";
import { useRealtimeChannel } from "@/lib/supabase/use-channel";
import { cn } from "@/lib/cn";
import {
  canModerateRoom,
  deleteRoomMessage,
  editRoomMessage,
  loadRoomMessage,
  loadRoomMessages,
  pinRoomMessage,
  sendRoomMessage,
  type RoomMessage,
} from "@/lib/room-actions";

/**
 * A group or event conversation: loads once, then follows new messages,
 * edits, removals and pins over Realtime. Pass `enabled={false}` when the
 * viewer isn't a member yet.
 *
 * The message menu (Figma 1766:37295 host / 1784:37877 You / 1784:37907
 * Member): Reply, Copy text, Edit and Delete your own; the event host or a
 * group admin can also Pin to top and delete anyone's. The database checks
 * every one of those.
 */
export function useRoomMessages(conversationId: string, enabled: boolean) {
  const viewer = useViewer();
  const toast = useToast();
  const [messages, setMessages] = useState<RoomMessage[] | null>(enabled ? null : []);
  const [sending, setSending] = useState(false);
  const [canModerate, setCanModerate] = useState(false);
  const [replyTo, setReplyTo] = useState<RoomMessage | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    loadRoomMessages(conversationId).then((rows) => {
      if (!cancelled) setMessages(rows);
    });
    canModerateRoom(conversationId).then((value) => {
      if (!cancelled) setCanModerate(value);
    });

    return () => {
      cancelled = true;
    };
  }, [conversationId, enabled]);

  const replace = useCallback((message: RoomMessage) => {
    setMessages((prev) => prev?.map((m) => (m.id === message.id ? message : m)) ?? prev);
  }, []);

  useRealtimeChannel(
    (supabase) =>
      !enabled
        ? null
        : supabase
      .channel(`room:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        async (payload) => {
          const row = payload.new as { id: string; sender_id: string | null };
          if (row.sender_id === viewer.id) return; // Added when sent.
          const message = await loadRoomMessage(row.id);
          if (message) {
            setMessages((prev) => (prev?.some((m) => m.id === message.id) ? prev : [...(prev ?? []), message]));
          }
        },
      )
      // Edits, removals and pins, from anyone (the host's land on yours too).
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        async (payload) => {
          const message = await loadRoomMessage((payload.new as { id: string }).id);
          if (message) replace(message);
        },
      )
      .subscribe(),
    [conversationId, enabled, viewer.id, replace],
  );

  const send = useCallback(
    async (body: string, mentioned: MentionPerson[] = []) => {
      setSending(true);
      const result = await sendRoomMessage(conversationId, body, mentioned.map((p) => p.id), replyTo?.id ?? null);
      setSending(false);
      if (result.error || !result.message) {
        toast({ title: result.error ?? "Your message didn't send.", tone: "danger" });
        return false;
      }
      const message = result.message;
      const kept = new Set(result.mentions);
      rememberMentions("messages", message.id, mentioned.filter((p) => kept.has(p.id)));
      setMessages((prev) => [...(prev ?? []), message]);
      setReplyTo(null);
      return true;
    },
    [conversationId, toast, replyTo],
  );

  const edit = useCallback(
    async (message: RoomMessage, body: string) => {
      const result = await editRoomMessage(message.id, body);
      if (result.error) {
        toast({ title: result.error, tone: "danger" });
        return false;
      }
      replace({ ...message, body: body.trim(), editedAt: result.editedAt ?? new Date().toISOString() });
      toast({ title: "Message updated", description: "Your edit is now visible to everyone, marked as edited." });
      return true;
    },
    [replace, toast],
  );

  const remove = useCallback(
    async (message: RoomMessage) => {
      const result = await deleteRoomMessage(message.id);
      if (result.error) {
        toast({ title: result.error, tone: "danger" });
        return false;
      }
      replace({ ...message, body: null, pinnedAt: null, deleted: { byModerator: !message.mine } });
      if (replyTo?.id === message.id) setReplyTo(null);
      toast({ title: "Message deleted", description: "It’s been removed for everyone in this conversation.", tone: "danger" });
      return true;
    },
    [replace, replyTo, toast],
  );

  const pin = useCallback(
    async (message: RoomMessage, pinned: boolean) => {
      const result = await pinRoomMessage(message.id, pinned);
      if (result.error) return toast({ title: result.error, tone: "danger" });
      const at = pinned ? new Date().toISOString() : null;
      // One pin per conversation: pinning this one unpins the last.
      setMessages(
        (prev) =>
          prev?.map((m) => (m.id === message.id ? { ...m, pinnedAt: at } : pinned ? { ...m, pinnedAt: null } : m)) ?? prev,
      );
      toast(
        pinned
          ? { title: "Pinned to top", description: "This message now shows at the top of the conversation." }
          : { title: "Unpinned" },
      );
    },
    [toast],
  );

  return { messages, send, sending, canModerate, edit, remove, pin, replyTo, setReplyTo, conversationId };
}

export type RoomChat = ReturnType<typeof useRoomMessages>;

const clock = new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit" });
const time = (iso: string) => clock.format(new Date(iso)).toLowerCase();
const composerId = (conversationId: string) => `room-composer-${conversationId}`;

/** Frame 222:13524's rows: avatar, then an ivory bubble with name and time. */
export function RoomMessageList({
  messages,
  hostId,
  empty,
  chat,
}: {
  messages: RoomMessage[] | null;
  /** Marks the event host's name, as Figma's "David(host)". */
  hostId?: string | null;
  empty: string;
  /** The message menu's actions; without it the list only reads. */
  chat?: RoomChat;
}) {
  if (messages === null) {
    return <MessagesSkeleton count={3} />;
  }

  // Removed messages keep their place ("This message was deleted" / "Removed by the host").
  const visible = messages.filter((m) => m.kind !== "system");
  if (visible.length === 0) {
    return <p className="py-6 text-center font-sans text-sm text-ink-300">{empty}</p>;
  }

  const pinned = visible.find((m) => m.pinnedAt && !m.deleted) ?? null;

  return (
    <div className="flex w-full flex-col gap-5">
      {pinned && <PinnedBanner message={pinned} chat={chat} />}
      <ul className="flex w-full flex-col gap-5">
        {visible.map((message) => (
          <MessageRow key={message.id} message={message} hostId={hostId} chat={chat} />
        ))}
      </ul>
    </div>
  );
}

function scrollToMessage(id: string) {
  const el = document.getElementById(`msg-${id}`);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.classList.add("ring-2", "ring-primary-200");
  setTimeout(() => el.classList.remove("ring-2", "ring-primary-200"), 1200);
}

/** "Pinned to top": the host's pinned message, above everything else. */
function PinnedBanner({ message, chat }: { message: RoomMessage; chat?: RoomChat }) {
  return (
    <div className="flex w-full items-start gap-3 rounded-lg border border-primary-200 bg-primary-50 px-3 py-2">
      <PinIcon className="mt-0.5 size-4 shrink-0 text-primary-600" />
      <button
        type="button"
        onClick={() => scrollToMessage(message.id)}
        className="flex min-w-0 flex-1 flex-col text-left"
      >
        <span className="font-sans text-xs font-semibold text-primary-600">
          Pinned · {message.mine ? "You" : (message.senderName ?? "Someone")}
        </span>
        <span className="line-clamp-2 font-sans text-sm text-ink-500">{message.body}</span>
      </button>
      {chat?.canModerate && (
        <button
          type="button"
          onClick={() => void chat.pin(message, false)}
          className="shrink-0 rounded-full px-2 py-1 font-ui text-xs font-medium text-primary-600 hover:bg-primary-100"
        >
          Unpin
        </button>
      )}
    </div>
  );
}

function MessageRow({
  message,
  hostId,
  chat,
}: {
  message: RoomMessage;
  hostId?: string | null;
  chat?: RoomChat;
}) {
  const toast = useToast();
  const [menu, setMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [reporting, setReporting] = useState(false);
  const name = message.mine ? "You" : (message.senderName ?? "Someone");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.body ?? "");
      toast({ title: "Copied", description: "Message text copied to your clipboard." });
    } catch {
      toast({ title: "Couldn't copy that message", tone: "danger" });
    }
  };

  const reply = () => {
    chat?.setReplyTo(message);
    document.getElementById(composerId(chat?.conversationId ?? ""))?.focus();
  };

  return (
    <li id={`msg-${message.id}`} className="flex gap-4 rounded-lg transition-shadow">
      <Avatar
        src={message.senderAvatar}
        name={message.senderName ?? "?"}
        userId={message.senderId ?? undefined}
        className="size-10"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1 overflow-hidden rounded-lg bg-ivory-100 px-3 py-2">
        {message.replyTo && !message.deleted && (
          <button
            type="button"
            onClick={() => scrollToMessage(message.replyTo!.id)}
            className="-mx-3 -mt-2 mb-1 flex flex-col border-l-2 border-primary-500 bg-primary-50 px-3 py-2 text-left"
          >
            <span className="font-sans text-xs font-semibold text-primary-600">
              {message.replyTo.mine ? "You" : (message.replyTo.senderName ?? "Someone")}
            </span>
            <span className="line-clamp-2 font-sans text-sm text-ink-500">{message.replyTo.preview}</span>
          </button>
        )}
        <span className="flex flex-wrap items-baseline gap-2">
          <span className="font-sans text-base font-medium text-ink-700">
            {name}
            {hostId && message.senderId === hostId && "(host)"}
          </span>
          <span className="font-sans text-sm text-ink-300" suppressHydrationWarning>
            {time(message.createdAt)}
          </span>
          {message.editedAt && !message.deleted && (
            <span className="font-sans text-sm text-ink-200">· edited</span>
          )}
          {message.pinnedAt && (
            <span className="self-center" aria-label="Pinned to top" title="Pinned to top">
              <PinIcon className="size-4 text-ink-500" />
            </span>
          )}
        </span>
        {message.deleted ? (
          <p className="font-sans text-sm text-ink-300 italic">
            {message.deleted.byModerator ? "Removed by the host" : "This message was deleted"}
          </p>
        ) : editing && chat ? (
          <EditBox
            initial={message.body ?? ""}
            onCancel={() => setEditing(false)}
            onSave={async (body) => {
              if (await chat.edit(message, body)) setEditing(false);
            }}
          />
        ) : (
          <p className="font-sans text-sm break-words whitespace-pre-line text-ink-400">
            {message.body && <MentionText text={message.body} source="messages" id={message.id} className="text-primary-600" />}
          </p>
        )}
      </div>

      {chat && !message.deleted && !editing ? (
        <div className="relative shrink-0">
          <button
            type="button"
            aria-label="Message options"
            aria-haspopup="menu"
            aria-expanded={menu}
            onClick={() => setMenu((v) => !v)}
            className="grid size-8 place-items-center rounded-full text-ink-700 transition-colors hover:bg-ivory-200"
          >
            <DotsIcon />
          </button>
          {menu && (
            <MessageMenu
              message={message}
              canModerate={chat.canModerate}
              onClose={() => setMenu(false)}
              onReply={reply}
              onCopy={copy}
              onEdit={() => setEditing(true)}
              onPin={() => void chat.pin(message, !message.pinnedAt)}
              onReport={() => setReporting(true)}
              onDelete={() => setConfirming(true)}
            />
          )}
        </div>
      ) : (
        chat && <span className="size-8 shrink-0" />
      )}

      {confirming && chat && (
        <ConfirmDialog
          title="Delete this message?"
          body={
            message.mine
              ? "It’ll be removed for everyone in this conversation. This can’t be undone."
              : "As the host, you can remove messages from anyone in this conversation. They’ll see it was removed by the host. This can’t be undone."
          }
          confirm="Delete message"
          onCancel={() => setConfirming(false)}
          onConfirm={async () => {
            if (await chat.remove(message)) setConfirming(false);
          }}
        />
      )}
      {reporting && (
        <ReportPostModal
          postId={message.id}
          targetType="message"
          quiet
          onClose={() => setReporting(false)}
          onReported={() => {
            setReporting(false);
            toast({ title: "Report sent", description: "Thanks for telling us. We’ll take a look." });
          }}
        />
      )}
    </li>
  );
}

/** The 245px menu from the post menu (115:6523), with the host's extras. */
function MessageMenu({
  message,
  canModerate,
  onClose,
  onReply,
  onCopy,
  onEdit,
  onPin,
  onReport,
  onDelete,
}: {
  message: RoomMessage;
  canModerate: boolean;
  onClose: () => void;
  onReply: () => void;
  onCopy: () => void;
  onEdit: () => void;
  onPin: () => void;
  onReport: () => void;
  onDelete: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPointer = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    // Deferred so the click that opened the menu doesn't immediately close it.
    const id = setTimeout(() => document.addEventListener("mousedown", onPointer));
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(id);
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const text = message.kind === "text";
  const pin = canModerate && { label: message.pinnedAt ? "Unpin" : "Pin to top", run: onPin };
  // Figma: You → Edit, Delete, Reply, Copy text; Member → Reply, Copy text,
  // Report; host on someone else's → Reply, Copy text, Pin to top | Report |
  // Delete message.
  const groups: { label: string; run: () => void; danger?: boolean }[][] = message.mine
    ? [
        [
          ...(text ? [{ label: "Edit", run: onEdit }] : []),
          { label: "Delete", run: onDelete, danger: true },
          { label: "Reply", run: onReply },
          ...(text ? [{ label: "Copy text", run: onCopy }] : []),
          ...(pin ? [pin] : []),
        ],
      ]
    : canModerate
      ? [
          [{ label: "Reply", run: onReply }, ...(text ? [{ label: "Copy text", run: onCopy }] : []), ...(pin ? [pin] : [])],
          [{ label: "Report", run: onReport }],
          [{ label: "Delete message", run: onDelete, danger: true }],
        ]
      : [[{ label: "Reply", run: onReply }, ...(text ? [{ label: "Copy text", run: onCopy }] : []), { label: "Report", run: onReport, danger: true }]];

  return (
    <div
      ref={ref}
      role="menu"
      className="absolute top-full right-0 z-20 mt-1 flex w-[220px] flex-col rounded-lg bg-surface py-2 shadow-[0px_0px_36px_0px_rgba(0,0,0,0.15)]"
    >
      {groups.map((items, i) => (
        <div key={i} className={cn("flex flex-col py-1", i > 0 && "mx-2.5 border-t border-ink-50")}>
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onClick={() => {
                onClose();
                item.run();
              }}
              className={cn(
                "px-4 py-2 text-left font-sans text-sm font-medium transition-colors hover:bg-ivory-200",
                i > 0 && "-mx-2.5 px-[26px]",
                item.danger ? "text-destructive-60" : "text-ink-500",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

function EditBox({
  initial,
  onCancel,
  onSave,
}: {
  initial: string;
  onCancel: () => void;
  onSave: (body: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);
  const ready = draft.trim() && draft.trim() !== initial.trim();

  const save = async () => {
    if (!ready || saving) return;
    setSaving(true);
    await onSave(draft);
    setSaving(false);
  };

  return (
    <div className="flex flex-col gap-2">
      <textarea
        autoFocus
        rows={2}
        maxLength={4000}
        value={draft}
        aria-label="Edit message"
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") onCancel();
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void save();
          }
        }}
        className="w-full resize-y rounded-lg bg-surface px-3 py-2 font-sans text-sm text-ink-500 outline-none focus:shadow-[0px_0px_0px_4px_rgba(249,189,152,0.25)]"
      />
      <span className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full px-3 py-1.5 font-ui text-sm font-medium text-ink-400 hover:bg-ivory-200"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!ready || saving}
          onClick={() => void save()}
          className="rounded-full bg-primary-500 px-4 py-1.5 font-ui text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </span>
    </div>
  );
}

/**
 * Figma 1766:37280 "Delete this message?" (and 1784:38047 "Delete this
 * Event?"): a destructive card, the full-width red action and Cancel.
 */
export function ConfirmDialog({
  title,
  body,
  confirm,
  onCancel,
  onConfirm,
}: {
  title: string;
  body: string;
  confirm: string;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4" onClick={onCancel}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="relative flex w-full max-w-[500px] flex-col gap-6 rounded-2xl border border-destructive-60 bg-destructive-5 p-6 sm:p-8"
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onCancel}
          className="absolute top-4 right-4 grid size-10 place-items-center rounded-lg bg-surface text-ink-700"
        >
          <svg viewBox="0 0 20 20" fill="none" className="size-5" aria-hidden="true">
            <path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
        <div className="flex flex-col gap-3 pt-8">
          <h2 className="font-display text-2xl font-semibold text-ink-800">{title}</h2>
          <p className="font-sans text-sm text-ink-400">{body}</p>
        </div>
        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await onConfirm();
              setBusy(false);
            }}
            className="w-full rounded-full bg-destructive-60 px-4 py-3 font-ui text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {busy ? "Deleting…" : confirm}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full px-4 py-2 font-ui text-sm font-medium text-destructive-60 hover:underline"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/** Frame 222:13512 — the pill input and round send button under a rule. */
export function RoomComposer({
  placeholder,
  onSend,
  sending,
  disabled = false,
  conversationId,
  replyTo,
  onCancelReply,
}: {
  placeholder: string;
  onSend: (body: string, mentioned: MentionPerson[]) => Promise<boolean>;
  sending: boolean;
  disabled?: boolean;
  /** Lets "@" offer the conversation's members. */
  conversationId?: string;
  /** Figma 1784:37381: the message being answered, above the input. */
  replyTo?: RoomMessage | null;
  onCancelReply?: () => void;
}) {
  const [draft, setDraft] = useState("");
  const picks = useMentionPicks();

  const submit = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setDraft("");
    const ok = await onSend(body, picks.peopleIn(body));
    if (!ok) setDraft(body);
    else picks.clear();
  };

  return (
    <div className="mx-auto flex w-full max-w-[724px] flex-col gap-3">
      {replyTo && (
        <div className="flex items-start gap-3 border-l-2 border-primary-500 bg-primary-50 px-3 py-2">
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="font-sans text-sm font-semibold text-primary-600">
              {replyTo.mine ? "You" : (replyTo.senderName ?? "Someone")}
            </span>
            <span className="truncate font-sans text-sm text-ink-500">{replyTo.body}</span>
          </span>
          <button
            type="button"
            aria-label="Cancel reply"
            onClick={onCancelReply}
            className="grid size-7 shrink-0 place-items-center rounded-full text-ink-400 hover:bg-primary-100"
          >
            <svg viewBox="0 0 20 20" fill="none" className="size-4" aria-hidden="true">
              <path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="flex w-full items-center gap-3"
      >
        <MentionInput
          as="input"
          id={conversationId ? composerId(conversationId) : undefined}
          value={draft}
          onChange={setDraft}
          onKeyDown={(e) => {
            if (e.key === "Escape" && replyTo) onCancelReply?.();
          }}
          context={conversationId ? { kind: "conversation", conversationId } : { kind: "people", people: [] }}
          picks={picks}
          placement="above"
          wrapperClassName="min-w-0 flex-1"
          placeholder={placeholder}
          aria-label={placeholder}
          maxLength={4000}
          disabled={disabled}
          className="w-full rounded-2xl bg-ivory-100 px-5 py-4 font-sans text-sm text-ink-500 outline-none placeholder:text-ink-300 focus:shadow-[0px_0px_0px_4px_rgba(249,189,152,0.25)] disabled:cursor-not-allowed"
        />
        <button
          type="submit"
          disabled={disabled || sending || !draft.trim()}
          aria-label="Send message"
          className="grid size-12 shrink-0 place-items-center rounded-full bg-primary-500 text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <svg viewBox="0 0 24 24" fill="none" className="size-5" aria-hidden="true">
            <path d="M4 12 20 4l-8 16-2-6-6-2Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          </svg>
        </button>
      </form>
    </div>
  );
}

function DotsIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="size-5" aria-hidden="true">
      <circle cx="10" cy="4.5" r="1.6" />
      <circle cx="10" cy="10" r="1.6" />
      <circle cx="10" cy="15.5" r="1.6" />
    </svg>
  );
}

function PinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path
        d="M12.5 2.5 17.5 7.5l-2.2.7-3.1 3.1-.4 3.6-1.4 1.4-2.6-2.6L4 17.5l-.5-.5 3.8-3.8-2.6-2.6 1.4-1.4 3.6-.4 3.1-3.1.7-2.2Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}
