"use client";

import { useEffect, useState } from "react";
import { Avatar } from "@/components/app/Avatar";
import { InvitationModal } from "@/components/app/invite/InvitationModal";
import { ArrowRight } from "@/components/ui/ArrowRight";
import { PersonRowsSkeleton } from "@/components/ui/Skeleton";
import { loadMyInvitations } from "@/lib/invite-actions";
import type { PendingInvitation } from "@/lib/invites";

/**
 * INVITATIONS — the top of the My Spaces and Space rails (Figma 122:8022,
 * 172:3169): "Amara invited you / to join 'New City'" on a pink wash, each
 * opening the invitation card. Renders nothing when there are none, so the
 * rail keeps its usual sections.
 */
export function InvitationsList({
  heading,
  titled = false,
  className,
}: {
  /** Wraps the rows with the rail's section title (and rule after). Client callers only. */
  heading?: (rows: React.ReactNode) => React.ReactNode;
  /** Server pages can't pass `heading` (a function); this adds the INVITATIONS title instead. */
  titled?: boolean;
  className?: string;
}) {
  const [invitations, setInvitations] = useState<PendingInvitation[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadMyInvitations().then((rows) => {
      if (!cancelled) setInvitations(rows);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (invitations === null) return heading || titled ? null : <PersonRowsSkeleton count={1} label="Loading invitations" />;
  if (invitations.length === 0) return null;

  const rows = (
    <ul className={className ?? "flex flex-col gap-2"}>
      {invitations.map((invite) => (
        <li key={invite.id}>
          <button
            type="button"
            onClick={() => setOpen(invite.token)}
            className="flex w-full items-center gap-4 rounded-lg p-3 text-left transition-opacity hover:opacity-90"
            style={{ backgroundImage: "var(--wash-pink)" }}
          >
            <Avatar src={invite.senderAvatar} name={invite.senderName} sizes="48px" className="size-12 shrink-0" />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-sans text-base font-medium text-ink-700">
                {invite.senderName} invited you
              </span>
              <span className="truncate font-sans text-xs text-ink-300">
                to walk alongside &ldquo;{invite.title}&rdquo;
              </span>
            </span>
            <ArrowRight className="size-5 shrink-0 text-primary-500" />
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <>
      {heading ? (
        heading(rows)
      ) : titled ? (
        <section className="flex flex-col gap-4">
          <h2 className="font-sans text-base font-medium tracking-wide text-ink-700 uppercase">Invitations</h2>
          {rows}
        </section>
      ) : (
        rows
      )}
      {open && (
        <InvitationModal
          token={open}
          onClose={() => {
            setOpen(null);
            loadMyInvitations().then(setInvitations);
          }}
        />
      )}
    </>
  );
}
