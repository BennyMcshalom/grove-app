"use client";

import { useState, useTransition } from "react";
import { Avatar } from "@/components/app/Avatar";
import { FormError } from "@/components/auth/FormError";
import { Button } from "@/components/ui/Button";
import { Modal, ModalHeader } from "@/components/ui/Modal";
import { sendCompanionMessage } from "@/lib/companion-actions";
import { cn } from "@/lib/cn";
import type { CompanionMessage } from "@/lib/invites";
import { timeAgo } from "@/lib/time";

/** Check-ins and replies between an owner and one companion, oldest first. */
export function CompanionThreadList({ messages, viewerId }: { messages: CompanionMessage[]; viewerId: string }) {
  if (messages.length === 0) return null;
  return (
    <ul className="flex flex-col gap-3">
      {messages.map((m) => {
        const mine = m.authorId === viewerId;
        return (
          <li key={m.id} className={cn("flex items-end gap-2", mine && "flex-row-reverse")}>
            <Avatar userId={m.authorId} src={m.authorAvatar} name={m.authorName} sizes="32px" className="size-8 shrink-0" />
            <div
              className={cn(
                "flex max-w-[80%] flex-col gap-1 rounded-2xl px-4 py-2.5",
                mine ? "rounded-br-md bg-primary-50" : "rounded-bl-md bg-ivory-200",
              )}
            >
              <p className="font-sans text-sm whitespace-pre-line text-ink-700">{m.body}</p>
              <span className="font-sans text-[11px] text-ink-300">
                {mine ? "You" : m.authorName} · {timeAgo(m.createdAt)}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** "Check in with John" / "Reply" — a small composer in a modal. */
export function CheckInModal({
  companionId,
  title,
  placeholder,
  onClose,
  onSent,
}: {
  companionId: string;
  title: string;
  placeholder: string;
  onClose: () => void;
  onSent: (message: CompanionMessage) => void;
}) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  return (
    <Modal label={title} onClose={onClose} width="max-w-[480px]">
      <ModalHeader title={title} onClose={onClose} />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={5}
        maxLength={2000}
        autoFocus
        placeholder={placeholder}
        className="w-full resize-y rounded-lg bg-ivory-100 px-3.5 py-2.5 font-sans text-base text-ink-500 outline-none placeholder:text-ink-200 focus:shadow-[0px_0px_0px_4px_rgba(249,189,152,0.25)]"
      />
      <FormError message={error} />
      <Button
        fullWidth
        loading={pending}
        disabled={!body.trim()}
        onClick={() =>
          startTransition(async () => {
            setError(undefined);
            const result = await sendCompanionMessage(companionId, body);
            if (result.error || !result.message) {
              setError(result.error);
              return;
            }
            onSent(result.message);
            onClose();
          })
        }
      >
        Send
      </Button>
    </Modal>
  );
}
