"use client";

import { useCallback, useEffect, useState } from "react";
import { Avatar } from "@/components/app/Avatar";
import { useToast } from "@/components/app/ToastProvider";
import { useViewer } from "@/components/app/ViewerProvider";
import {
  loadRoomMessage,
  loadRoomMessages,
  sendRoomMessage,
  type RoomMessage,
} from "@/lib/room-actions";
import { createClient } from "@/lib/supabase/client";

/**
 * A group or event conversation: loads once, then follows new messages over
 * Realtime. Pass `enabled={false}` when the viewer isn't a member yet.
 */
export function useRoomMessages(conversationId: string, enabled: boolean) {
  const viewer = useViewer();
  const toast = useToast();
  const [messages, setMessages] = useState<RoomMessage[] | null>(enabled ? null : []);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    loadRoomMessages(conversationId).then((rows) => {
      if (!cancelled) setMessages(rows);
    });

    const supabase = createClient();
    const channel = supabase
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
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [conversationId, enabled, viewer.id]);

  const send = useCallback(
    async (body: string) => {
      setSending(true);
      const result = await sendRoomMessage(conversationId, body);
      setSending(false);
      if (result.error || !result.message) {
        toast({ title: result.error ?? "Your message didn't send.", tone: "danger" });
        return false;
      }
      const message = result.message;
      setMessages((prev) => [...(prev ?? []), message]);
      return true;
    },
    [conversationId, toast],
  );

  return { messages, send, sending };
}

const clock = new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit" });

/** Frame 222:13524's rows: avatar, then an ivory bubble with name and time. */
export function RoomMessageList({
  messages,
  hostId,
  empty,
}: {
  messages: RoomMessage[] | null;
  /** Marks the event host's name, as Figma's "David(host)". */
  hostId?: string | null;
  empty: string;
}) {
  if (messages === null) {
    return <p className="py-6 text-center font-sans text-sm text-ink-300">Loading conversation…</p>;
  }

  const visible = messages.filter((m) => m.kind !== "system");
  if (visible.length === 0) {
    return <p className="py-6 text-center font-sans text-sm text-ink-300">{empty}</p>;
  }

  return (
    <ul className="flex w-full flex-col gap-5">
      {visible.map((message) => (
        <li key={message.id} className="flex gap-4">
          <Avatar
            src={message.senderAvatar}
            name={message.senderName ?? "?"}
            className="size-10"
          />
          <div className="flex min-w-0 flex-1 flex-col gap-1 rounded-lg bg-ivory-100 px-3 py-2">
            <span className="flex flex-wrap items-baseline gap-2">
              <span className="font-sans text-base font-medium text-ink-700">
                {message.mine ? "You" : (message.senderName ?? "Someone")}
                {hostId && message.senderId === hostId && "(host)"}
              </span>
              <span className="font-sans text-sm text-ink-300" suppressHydrationWarning>
                {clock.format(new Date(message.createdAt)).toLowerCase()}
              </span>
            </span>
            <p className="font-sans text-sm whitespace-pre-line text-ink-400">{message.body}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Frame 222:13512 — the pill input and round send button under a rule. */
export function RoomComposer({
  placeholder,
  onSend,
  sending,
  disabled = false,
}: {
  placeholder: string;
  onSend: (body: string) => Promise<boolean>;
  sending: boolean;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState("");

  const submit = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setDraft("");
    const ok = await onSend(body);
    if (!ok) setDraft(body);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      className="mx-auto flex w-full max-w-[724px] items-center gap-3"
    >
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        maxLength={4000}
        disabled={disabled}
        className="min-w-0 flex-1 rounded-2xl bg-ivory-100 px-5 py-4 font-sans text-sm text-ink-500 outline-none placeholder:text-ink-300 focus:shadow-[0px_0px_0px_4px_rgba(249,189,152,0.25)] disabled:cursor-not-allowed"
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
  );
}
