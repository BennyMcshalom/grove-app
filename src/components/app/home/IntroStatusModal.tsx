"use client";

import { useEffect, useState, useTransition } from "react";
import { Avatar } from "@/components/app/Avatar";
import { useToast } from "@/components/app/ToastProvider";
import { SendIcon } from "@/components/app/home/IntroduceModal";
import { Button } from "@/components/ui/Button";
import { Modal, ModalClose, ModalStatus } from "@/components/ui/Modal";
import { getChapter } from "@/lib/chapters";
import { markIntroductionsSeen, respondToIntroduction } from "@/lib/match-actions";
import type { Introduction } from "@/lib/matches";

/**
 * Where an introduction stands — Figma 1176:20203 (Waiting to hear back),
 * 1176:20215 ("Priya said yes!") and 1176:20234 (Not this time). For the
 * recipient it's the introduction itself, with Accept and Decline.
 */
export function IntroStatusModal({
  intro,
  onClose,
  onFindMatches,
}: {
  intro: Introduction;
  onClose: () => void;
  onFindMatches: () => void;
}) {
  const toast = useToast();
  const [status, setStatus] = useState(intro.status);
  const [answering, startAnswering] = useTransition();
  const received = intro.direction === "received";

  useEffect(() => {
    if (received && !intro.seen) void markIntroductionsSeen();
  }, [received, intro.seen]);

  const answer = (accept: boolean) =>
    startAnswering(async () => {
      const result = await respondToIntroduction(intro.connectionId, accept);
      if (result.error) {
        toast({ title: result.error, tone: "danger" });
        return;
      }
      setStatus(accept ? "accepted" : "declined");
      toast({ title: accept ? `You and ${intro.name} are connected` : "Introduction declined" });
      if (!accept) onClose();
    });

  const conversation = `/bonds?with=${intro.userId}`;

  let body: React.ReactNode;
  let actions: React.ReactNode;

  if (received && status === "pending") {
    const space = intro.chapterSlug ? getChapter(intro.chapterSlug)?.name : undefined;
    body = (
      <div className="flex flex-col items-center gap-4 py-2 text-center">
        <Avatar src={intro.avatarUrl} name={intro.name} sizes="64px" className="size-16" />
        <h2 className="font-display text-2xl font-semibold text-ink-800">{intro.name} introduced themselves</h2>
        {(space || intro.phase) && (
          <span className="rounded-full bg-primary-50 px-3 py-1 font-sans text-sm text-primary-600">
            {[space, intro.phase].filter(Boolean).join(" · ")}
          </span>
        )}
        {intro.prompt && <p className="font-sans text-sm text-ink-300">{intro.prompt}</p>}
        <p className="w-full rounded-lg bg-ivory-100 p-4 text-left font-sans text-base whitespace-pre-line text-ink-500">
          {intro.message}
        </p>
        <p className="font-sans text-sm text-ink-300">Accepting brings them into your circle, and you can chat freely.</p>
      </div>
    );
    actions = (
      <div className="flex gap-4">
        <Button variant="secondary" size="md" fullWidth disabled={answering} onClick={() => answer(false)}>
          Decline
        </Button>
        <Button size="md" fullWidth loading={answering} onClick={() => answer(true)}>
          Accept
        </Button>
      </div>
    );
  } else if (status === "accepted") {
    body = (
      <ModalStatus icon={<SendIcon />} title={received ? `You and ${intro.name} are connected` : `${intro.name} said yes!`}>
        {received
          ? "This is the start of a new conversation — say hello and see where it goes."
          : "Your introduction was accepted. This is the start of a new conversation — say hello and see where it goes."}
      </ModalStatus>
    );
    actions = (
      <div className="flex flex-col gap-4 sm:flex-row">
        <Button size="md" fullWidth href={conversation}>
          Start Conversation
        </Button>
        <Button variant="secondary" size="md" fullWidth onClick={onFindMatches}>
          Back to matches
        </Button>
      </div>
    );
  } else if (status === "declined") {
    body = (
      <ModalStatus icon={<SendIcon />} title="Not this time">
        {received
          ? `You declined ${intro.name}'s introduction.`
          : `${intro.name} isn’t able to connect right now. That’s okay — it happens, and it’s not a reflection on you. There are more people to meet.`}
      </ModalStatus>
    );
    actions = (
      <Button variant="secondary" size="md" fullWidth onClick={onFindMatches}>
        Find more matches
      </Button>
    );
  } else {
    body = (
      <ModalStatus icon={<SendIcon />} title={intro.seen ? "Waiting to hear back" : "Introduction sent"}>
        {intro.seen
          ? `${intro.name} has seen your introduction. These things take a little time — you’ll get a notification the moment they respond.`
          : `Your introduction is on its way to ${intro.name}. They’ll decide whether they’d like to connect.`}
      </ModalStatus>
    );
    actions = (
      <Button variant="secondary" size="md" fullWidth onClick={onFindMatches}>
        Back to matches
      </Button>
    );
  }

  return (
    <Modal label="Introduction" onClose={onClose} width="max-w-[560px]">
      <div className="flex justify-end">
        <ModalClose onClose={onClose} />
      </div>
      {body}
      <div className="border-t border-ink-50 pt-6">{actions}</div>
    </Modal>
  );
}
