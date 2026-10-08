"use client";

import { useState, useTransition } from "react";
import { GlowAvatar } from "@/components/app/BondChat";
import { ConfirmDialog } from "@/components/app/bonds/ConfirmDialog";
import { usePaywall } from "@/components/app/pass/PaywallProvider";
import { useToast } from "@/components/app/ToastProvider";
import { FormError } from "@/components/auth/FormError";
import { Button } from "@/components/ui/Button";
import { Modal, ModalHeader } from "@/components/ui/Modal";
import {
  endBond,
  inviteToBond,
  logBondCheckin,
  respondToBondInvite,
  setBondGoal,
} from "@/lib/bond-actions";
import { cn } from "@/lib/cn";
import { localDay } from "@/lib/log";

/** The ivory writing well every Bond dialog uses (LogPrompt's textarea). */
export const WELL =
  "w-full resize-y rounded-lg bg-ivory-100 px-3.5 py-4 font-sans text-base text-ink-600 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] outline-none placeholder:text-ink-200 focus:shadow-[0px_0px_0px_4px_rgba(249,189,152,0.25)]";

export const FIELD_LABEL = "font-sans text-sm font-medium text-ink-700 uppercase";

/**
 * "Turn this into a Bond" — Figma 1102:24491. The goal both people are
 * working toward, then Send Bond invite.
 */
export function InviteToBondModal({
  userId,
  name,
  onClose,
}: {
  userId: string;
  name: string;
  onClose: () => void;
}) {
  const toast = useToast();
  const paywall = usePaywall();
  const [goal, setGoal] = useState("");
  const [error, setError] = useState<string>();
  const [busy, start] = useTransition();

  const send = () =>
    start(async () => {
      const result = await inviteToBond(userId, goal, name);
      if (result.locked) {
        onClose();
        return paywall("invite_bond");
      }
      if (result.error) return setError(result.error);
      onClose();
      toast({
        title: "Bond invite sent",
        description: `${name} has been invited to make this connection a Bond. You’ll be notified when they respond.`,
      });
    });

  return (
    <Modal label="Turn this into a Bond" onClose={onClose}>
      <ModalHeader title="Turn this into a Bond" onClose={onClose} />
      <p className="font-sans text-base text-ink-500">
        A Bond is something you both choose. If {name} accepts, you’ll have a shared space for check-ins,
        reflections and intentions.
      </p>
      <label className="flex flex-col gap-2">
        <span className={FIELD_LABEL}>What are you both working toward?</span>
        <textarea
          autoFocus
          rows={4}
          maxLength={200}
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="e.g. Checking in on our first year in a new city"
          className={WELL}
        />
      </label>
      <FormError message={error} />
      <div className="border-t border-ink-50 pt-6">
        <Button size="sm" fullWidth loading={busy} disabled={busy || !goal.trim()} onClick={send}>
          Send Bond invite
        </Button>
      </div>
    </Modal>
  );
}

/**
 * "Bond invitation" — Figma 1228:29152. Who asked, their goal, and Accept /
 * Decline. Accepting needs the Season Pass; declining never does.
 */
export function BondInvitationModal({
  invite,
  onClose,
  onDone,
}: {
  invite: { bondId: string; name: string; avatarUrl: string | null; goal: string | null };
  onClose: () => void;
  onDone?: (accepted: boolean) => void;
}) {
  const respond = useRespondToInvite();
  const [busy, start] = useTransition();

  const act = (accept: boolean) =>
    start(async () => {
      const ok = await respond(invite.bondId, accept, invite.name);
      if (ok) {
        onDone?.(accept);
        onClose();
      }
    });

  return (
    <Modal label="Bond invitation" onClose={onClose} width="max-w-[560px]">
      <ModalHeader title="Bond invitation" onClose={onClose} />
      <p className="font-sans text-base text-ink-500">
        You’ll have a shared space for check-ins, reflections, and things you want to work towards together.
      </p>
      <div className="flex items-center gap-4 border-b border-ink-50 pb-6">
        <GlowAvatar src={invite.avatarUrl} name={invite.name} size={48} />
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="font-sans text-base font-semibold text-ink-700">{invite.name}</span>
          {invite.goal && <span className="font-sans text-sm text-ink-400">Goal: {invite.goal}</span>}
        </span>
      </div>
      <div className="flex gap-3">
        <Button size="sm" fullWidth disabled={busy} onClick={() => act(true)}>
          Accept
        </Button>
        <Button size="sm" variant="secondary" fullWidth disabled={busy} onClick={() => act(false)}>
          Decline
        </Button>
      </div>
    </Modal>
  );
}

/** Accept / Decline with the paywall and the section's toasts (1228:29219/29220). */
export function useRespondToInvite() {
  const toast = useToast();
  const paywall = usePaywall();
  return async (bondId: string, accept: boolean, name: string) => {
    const result = await respondToBondInvite(bondId, accept, name);
    if (result.locked) {
      paywall("invite_bond");
      return false;
    }
    if (result.error) {
      toast({ title: result.error, tone: "danger" });
      return false;
    }
    toast(
      accept
        ? { title: "Bond request accepted", description: `You and ${name} are Bonded now.` }
        : { title: "Bond request declined", tone: "danger" },
    );
    return true;
  };
}

/**
 * "Release this Bond?" — Figma 1610:39648 / 1798:58579 (the Release ritual),
 * toast 1610:36758. The shared record stays read-only; the chat carries on
 * as an ordinary connection.
 */
export function EndBondModal({
  bondId,
  name,
  onClose,
  onEnded,
}: {
  bondId: string;
  name: string;
  onClose: () => void;
  onEnded?: () => void;
}) {
  const toast = useToast();
  const [busy, start] = useTransition();

  return (
    <ConfirmDialog
      title="Release this Bond?"
      action="Release Bond"
      tone="warning"
      busy={busy}
      onClose={onClose}
      onConfirm={() =>
        start(async () => {
          const result = await endBond(bondId);
          if (result.error) return void toast({ title: result.error, tone: "danger" });
          onClose();
          onEnded?.();
          toast({
            title: "Bond released",
            description: "Your shared history stays as a read-only record.",
          });
        })
      }
    >
      Releasing this Bond ends your shared goal and check-ins, what you shared stays as a read-only record and
      nothing new can be added. The chat itself stays as an ordinary connection with {name}. This can&rsquo;t be
      undone.
    </ConfirmDialog>
  );
}

/** "Log a check-in" — Figma 1236:22458. */
export function CheckinModal({
  bondId,
  name,
  onClose,
}: {
  bondId: string;
  name: string;
  onClose: () => void;
}) {
  const toast = useToast();
  const paywall = usePaywall();
  const [mode, setMode] = useState<"in_app" | "in_person">("in_app");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string>();
  const [busy, start] = useTransition();
  const today = localDay();
  const todayLabel = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date());

  const save = () =>
    start(async () => {
      const result = await logBondCheckin(bondId, mode, body, today);
      if (result.locked) {
        onClose();
        return paywall("invite_bond");
      }
      if (result.error) return setError(result.error);
      onClose();
      toast({ title: "Check-in saved" });
    });

  return (
    <Modal label="Log a check-in" onClose={onClose}>
      <ModalHeader title="Log a check-in" onClose={onClose} />
      <p className="font-sans text-base text-ink-500">A quick note about a moment with {name}, big or small.</p>
      <div className="flex flex-col gap-2">
        <span className={FIELD_LABEL}>How did it happen</span>
        <div role="radiogroup" className="flex w-fit rounded-full bg-ivory-300 p-1">
          {(
            [
              ["in_app", "In the app"],
              ["in_person", "In person"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={mode === value}
              onClick={() => setMode(value)}
              className={cn(
                "rounded-full px-4 py-1.5 font-sans text-sm font-medium transition-colors",
                mode === value ? "bg-surface text-ink-700 shadow-sm" : "text-ink-400 hover:text-ink-600",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <label className="flex flex-col gap-2">
        <span className={FIELD_LABEL}>What happened</span>
        <textarea
          rows={4}
          maxLength={500}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Share a quick line about it — a message, a call, dinner, anything."
          className={WELL}
        />
      </label>
      <span className="font-sans text-sm text-ink-400">Today · {todayLabel}</span>
      <FormError message={error} />
      <Button size="sm" fullWidth loading={busy} disabled={busy || !body.trim()} onClick={save}>
        Save check-in
      </Button>
    </Modal>
  );
}

/** "Edit goal" on Bond Details: the goal and, optionally, how long it runs. */
export function EditGoalModal({
  bondId,
  goal: initialGoal,
  horizonMonths,
  onClose,
}: {
  bondId: string;
  goal: string | null;
  horizonMonths: number | null;
  onClose: () => void;
}) {
  const toast = useToast();
  const paywall = usePaywall();
  const [goal, setGoal] = useState(initialGoal ?? "");
  const [months, setMonths] = useState(horizonMonths ? String(horizonMonths) : "");
  const [error, setError] = useState<string>();
  const [busy, start] = useTransition();

  const save = () =>
    start(async () => {
      const result = await setBondGoal(bondId, goal, months ? Number(months) : null);
      if (result.locked) {
        onClose();
        return paywall("invite_bond");
      }
      if (result.error) return setError(result.error);
      onClose();
      toast({ title: "Goal updated" });
    });

  return (
    <Modal label="Shared goal" onClose={onClose}>
      <ModalHeader title={initialGoal ? "Edit goal" : "Set a shared goal"} onClose={onClose} />
      <label className="flex flex-col gap-2">
        <span className={FIELD_LABEL}>What are you both working toward?</span>
        <textarea
          autoFocus
          rows={3}
          maxLength={200}
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="e.g. Checking in on our first year in a new city"
          className={WELL}
        />
      </label>
      <label className="flex flex-col gap-2">
        <span className={FIELD_LABEL}>For how long</span>
        <select
          value={months}
          onChange={(e) => setMonths(e.target.value)}
          className="w-fit rounded-lg bg-ivory-100 px-3 py-2.5 font-sans text-base text-ink-600 outline-none"
        >
          <option value="">No set length</option>
          {[1, 2, 3, 6, 7, 9, 12, 18, 24].map((m) => (
            <option key={m} value={m}>
              {m} {m === 1 ? "month" : "months"}
            </option>
          ))}
        </select>
      </label>
      <FormError message={error} />
      <Button size="sm" fullWidth loading={busy} disabled={busy || !goal.trim()} onClick={save}>
        Save goal
      </Button>
    </Modal>
  );
}
