"use client";

import { useState, useTransition } from "react";
import { useToast } from "@/components/app/ToastProvider";
import { Button } from "@/components/ui/Button";
import { Modal, ModalClose, ModalHeader, ModalStatus } from "@/components/ui/Modal";
import { introduceYourself } from "@/lib/match-actions";
import { starterPrompts } from "@/lib/matches";
import { cn } from "@/lib/cn";

export interface IntroTarget {
  userId: string;
  name: string;
  chapterSlug: string | null;
  phase: string | null;
}

/**
 * Introduce yourself — Figma 980:20547, with the send error 984:19005 and
 * "Introduction sent" 982:20866.
 *
 * An optional starter prompt, a short note, and a reminder that it isn't an
 * automatic connection. A failed send keeps every word and offers Retry.
 */
export function IntroduceModal({
  person,
  onClose,
  onSent,
  backLabel = "Back to matches",
}: {
  person: IntroTarget;
  onClose: () => void;
  /** After the "Introduction sent" card; `accepted` if they'd already asked you. */
  onSent?: (accepted: boolean) => void;
  backLabel?: string;
}) {
  const toast = useToast();
  const [prompt, setPrompt] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [sending, startSending] = useTransition();
  const prompts = starterPrompts(person);

  const send = () => {
    if (!message.trim()) {
      setFailed("Write a short note first.");
      return;
    }
    startSending(async () => {
      // A dropped connection throws; the note stays either way.
      const result = await introduceYourself({
        userId: person.userId,
        message,
        prompt,
        chapterSlug: person.chapterSlug,
      }).catch((): { error: string; accepted?: boolean } => ({
        error: "Couldn't send. Your message is saved — try again when you're ready.",
      }));
      if (result.error) {
        setFailed(result.error);
        return;
      }
      setFailed(null);
      if (result.accepted) {
        toast({ title: `You and ${person.name} are connected`, description: "They'd already introduced themselves." });
        onSent?.(true);
        onClose();
        return;
      }
      setSent(true);
    });
  };

  if (sent) {
    return (
      <Modal label="Introduction sent" onClose={onClose} width="max-w-[560px]">
        <div className="flex justify-end">
          <ModalClose onClose={onClose} />
        </div>
        <ModalStatus icon={<SendIcon />} title="Introduction sent">
          Your introduction is on its way to {person.name}. They&rsquo;ll decide whether they&rsquo;d like to connect.
        </ModalStatus>
        <div className="border-t border-ink-50 pt-6">
          <Button
            variant="secondary"
            size="md"
            fullWidth
            onClick={() => {
              onSent?.(false);
              onClose();
            }}
          >
            {backLabel}
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal label={`Introduce yourself to ${person.name}`} onClose={onClose}>
      <ModalHeader title={`Introduce yourself to ${person.name}`} onClose={onClose} />

      {failed && (
        <p role="alert" className="w-fit rounded-full bg-destructive-5 px-3 py-1.5 font-sans text-sm text-destructive-60">
          {failed}
        </p>
      )}

      <p className="font-sans text-base text-ink-500">
        Write a short note. {person.name} chooses whether to accept before you can chat freely.
      </p>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-4 font-sans text-sm font-medium tracking-wide text-ink-300 uppercase">
          Optional starter prompt
        </legend>
        <div className="flex flex-wrap gap-3">
          {prompts.map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={prompt === p}
              onClick={() => {
                setPrompt(prompt === p ? null : p);
                // A tapped prompt starts the note when it's still empty.
                if (!message.trim() && prompt !== p) setMessage(`${p}: `);
              }}
              className={cn(
                "rounded-full px-3 py-1.5 font-sans text-sm font-medium transition-colors",
                prompt === p ? "bg-primary-500 text-white" : "bg-primary-50 text-primary-600 hover:bg-primary-100",
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-1.5">
        <span className="font-sans text-sm font-medium tracking-wide text-ink-500 uppercase">Your message</span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          maxLength={1000}
          placeholder={`Hi ${person.name} — saw we’re both ${person.phase ? `at ${person.phase.toLowerCase()}` : "in a similar chapter"} right now…`}
          className="w-full resize-y rounded-lg bg-ivory-100 px-3.5 py-2.5 font-sans text-base text-ink-500 outline-none placeholder:text-ink-300 focus:shadow-[0px_0px_0px_4px_rgba(249,189,152,0.25)]"
        />
      </label>

      <div className="flex flex-col gap-4 border-t border-ink-50 pt-6">
        <p className="text-center font-sans text-base text-ink-300">
          Your introduction isn&rsquo;t an automatic connection. {person.name} gets to decide whether they&rsquo;d like to
          connect with you.
        </p>
        <Button size="md" fullWidth loading={sending} onClick={send}>
          {failed?.startsWith("Couldn't send") ? "Retry" : "Send introduction"}
        </Button>
      </div>
    </Modal>
  );
}

export function SendIcon({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M21 3 10.5 13.5M21 3l-6.5 18-4-7.5L3 9.5 21 3Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
