"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { EndBondModal } from "@/components/app/bonds/BondModals";
import { ConfirmDialog } from "@/components/app/bonds/ConfirmDialog";
import { BlockDialog, ReportPersonModal } from "@/components/app/bonds/SafetyDialogs";
import { useToast } from "@/components/app/ToastProvider";
import { chatMuted, removeFromCircle, setChatMuted } from "@/lib/bond-actions";
import type { BondPerson } from "@/lib/bonds";
import { cn } from "@/lib/cn";

type Dialog = "mute" | "release" | "remove" | "block" | "report";

/**
 * The chat header's "…" — Figma "Bond actions" 1610:39540 / 1650:39710:
 * Mute (or Unmute) Bond, a rule, then Release Bond, Block and Report, each
 * confirmed in its own dialog (1610:36719, 1645:23515, 1610:39648,
 * 1610:39615, 1610:36739) and answered with a toast. A circle chat has the
 * same shape with View profile and Remove from circle instead of Release.
 */
export function ChatMenu({
  person,
  conversationId,
  trigger,
}: {
  person: BondPerson;
  conversationId: string | null;
  trigger: React.ReactNode;
}) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [muted, setMuted] = useState<boolean | null>(null);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const bondId = person.relationship === "bond" ? person.bondId : null;
  const [busy, startBusy] = useTransition();
  const menu = useRef<HTMLDivElement>(null);
  const first = person.name.split(" ")[0] || person.name;

  useEffect(() => {
    if (!open || !conversationId) return;
    let live = true;
    void chatMuted(conversationId).then((value) => {
      if (live) setMuted(value);
    });
    return () => {
      live = false;
    };
  }, [open, conversationId]);

  // Close on an outside click.
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!menu.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const choose = (next: Dialog) => {
    setDialog(next);
    setOpen(false);
  };
  const close = () => setDialog(null);

  const toggleMute = () =>
    startBusy(async () => {
      if (!conversationId) return;
      const next = !muted;
      const result = await setChatMuted(conversationId, next);
      if (result.error) return void toast({ title: result.error, tone: "danger" });
      setMuted(next);
      close();
      // Toasts 1645:23507 / 1645:23530.
      toast(
        next
          ? {
              title: bondId ? "Bond muted" : "Chat muted",
              description: `You won’t get notifications from ${first}.${bondId ? " The Bond stays active." : ""}`,
            }
          : {
              title: bondId ? "Bond unmuted" : "Chat unmuted",
              description: `You’ll get notifications from ${first} again.`,
            },
      );
    });

  const remove = () =>
    startBusy(async () => {
      const result = await removeFromCircle(person.userId);
      if (result.error) return void toast({ title: result.error, tone: "danger" });
      close();
      toast({ title: `${person.name} is no longer in your circle` });
    });

  const label = bondId ? " Bond" : "";

  return (
    <div ref={menu} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="More"
        onClick={() => setOpen((v) => !v)}
        className="rounded-full"
      >
        {trigger}
      </button>

      {open && (
        <ul
          role="menu"
          className="absolute top-full right-0 z-30 mt-2 flex w-56 flex-col rounded-xl bg-surface p-1.5 shadow-[0px_8px_24px_0px_rgba(0,0,0,0.12)]"
        >
          {!bondId && <MenuLink href={`/people/${person.userId}`}>View profile</MenuLink>}
          {conversationId && (
            <MenuItem onClick={() => choose("mute")} disabled={muted === null}>
              {muted ? "Unmute" : "Mute"}
              {label}
            </MenuItem>
          )}
          <li role="separator" className="mx-1.5 my-1 h-px bg-ink-50" />
          {bondId ? (
            <MenuItem danger onClick={() => choose("release")}>
              Release Bond
            </MenuItem>
          ) : (
            <MenuItem danger onClick={() => choose("remove")}>
              Remove from circle
            </MenuItem>
          )}
          <MenuItem danger onClick={() => choose("block")}>
            Block
          </MenuItem>
          <MenuItem danger onClick={() => choose("report")}>
            Report
          </MenuItem>
        </ul>
      )}

      {dialog === "mute" && (
        <ConfirmDialog
          title={`${muted ? "Unmute" : "Mute"} this${label || " chat"}?`}
          action={`${muted ? "Unmute" : "Mute"}${label || " chat"}`}
          busy={busy}
          onConfirm={toggleMute}
          onClose={close}
        >
          {muted
            ? `You’ll start getting notifications from ${first} again. Nothing else about the${label || " chat"} changes.`
            : `You won’t get notifications from ${first}, but the${label || " chat"} stays active and messages still arrive.`}
        </ConfirmDialog>
      )}

      {dialog === "release" && bondId && <EndBondModal bondId={bondId} name={person.name} onClose={close} />}

      {dialog === "remove" && (
        <ConfirmDialog
          title={`Remove ${first} from your circle?`}
          action="Remove from circle"
          tone="danger"
          busy={busy}
          onConfirm={remove}
          onClose={close}
        >
          Your chat stays, but you can&rsquo;t message each other until you reconnect.
        </ConfirmDialog>
      )}

      {dialog === "block" && (
        <BlockDialog
          userId={person.userId}
          name={person.name}
          context={bondId ? "bond" : "circle"}
          onClose={close}
        />
      )}

      {dialog === "report" && <ReportPersonModal userId={person.userId} what="conversation" onClose={close} />}
    </div>
  );
}

function MenuItem({
  children,
  onClick,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <li role="none">
      <button
        type="button"
        role="menuitem"
        onClick={onClick}
        disabled={disabled}
        className={cn(
          "w-full rounded-lg px-3 py-2.5 text-left font-sans text-sm transition-colors hover:bg-ivory-100 disabled:opacity-50",
          danger ? "text-destructive-60" : "text-ink-700",
        )}
      >
        {children}
      </button>
    </li>
  );
}

function MenuLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li role="none">
      <Link
        role="menuitem"
        href={href}
        className="block rounded-lg px-3 py-2.5 font-sans text-sm text-ink-700 transition-colors hover:bg-ivory-100"
      >
        {children}
      </Link>
    </li>
  );
}
