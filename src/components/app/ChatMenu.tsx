"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { ReportPostModal } from "@/components/app/PostModals";
import { ConfirmBar } from "@/components/app/PersonView";
import { useToast } from "@/components/app/ToastProvider";
import { blockUser, chatMuted, removeFromCircle, setChatMuted } from "@/lib/bond-actions";
import type { BondPerson } from "@/lib/bonds";
import { cn } from "@/lib/cn";

/**
 * The chat header's "…": view profile, mute, remove from circle, block,
 * report. No Figma frame; it borrows the post menu's look. Bonds are formed
 * by the engine, so there's no "unbond" — removing someone from your circle
 * ends a bond as well, because only connected people can be bonded.
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
  const [confirming, setConfirming] = useState<"remove" | "block" | null>(null);
  const [reporting, setReporting] = useState(false);
  const [busy, startBusy] = useTransition();
  const menu = useRef<HTMLDivElement>(null);

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

  const toggleMute = () =>
    startBusy(async () => {
      if (!conversationId) return;
      const next = !muted;
      const result = await setChatMuted(conversationId, next);
      if (result.error) return toast({ title: result.error, tone: "danger" });
      setMuted(next);
      setOpen(false);
      toast({ title: next ? `Muted ${person.name}` : `Unmuted ${person.name}` });
    });

  const confirm = () =>
    startBusy(async () => {
      const result = confirming === "block" ? await blockUser(person.userId) : await removeFromCircle(person.userId);
      if (result.error) return toast({ title: result.error, tone: "danger" });
      setConfirming(null);
      toast({
        title:
          confirming === "block" ? `Blocked ${person.name}` : `${person.name} is no longer in your circle`,
      });
    });

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
          <MenuLink href={`/people/${person.userId}`}>View profile</MenuLink>
          {conversationId && (
            <MenuItem onClick={toggleMute} disabled={busy || muted === null}>
              {muted ? "Unmute" : "Mute"}
            </MenuItem>
          )}
          <MenuItem
            onClick={() => {
              setConfirming("remove");
              setOpen(false);
            }}
          >
            Remove from circle
          </MenuItem>
          <MenuItem
            danger
            onClick={() => {
              setConfirming("block");
              setOpen(false);
            }}
          >
            Block
          </MenuItem>
          <MenuItem
            danger
            onClick={() => {
              setReporting(true);
              setOpen(false);
            }}
          >
            Report
          </MenuItem>
        </ul>
      )}

      {confirming && (
        <div className="absolute top-full right-0 z-30 mt-2 w-72">
          <ConfirmBar
            message={
              confirming === "block"
                ? `Block ${person.name}? They won't be able to message, call, connect with or see you nearby.`
                : `Remove ${person.name} from your circle? ${person.relationship === "bond" ? "Your bond ends too. " : ""}Your chat stays, but you can't message until you reconnect.`
            }
            action={confirming === "block" ? "Block" : "Remove"}
            busy={busy}
            onConfirm={confirm}
            onCancel={() => setConfirming(null)}
          />
        </div>
      )}

      {reporting && (
        <ReportPostModal
          postId={person.userId}
          targetType="profile"
          onClose={() => setReporting(false)}
          onReported={() => {
            setReporting(false);
            toast({ title: "Thanks. Our team will take a look." });
          }}
        />
      )}
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
