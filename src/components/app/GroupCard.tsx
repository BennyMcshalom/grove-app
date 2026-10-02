"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Avatar } from "@/components/app/Avatar";
import { useToast } from "@/components/app/ToastProvider";
import { Button } from "@/components/ui/Button";
import { ArrowRight } from "@/components/ui/ArrowRight";
import { GroupArt } from "@/components/app/GroupArt";
import { joinGroup } from "@/app/(app)/groups/actions";
import { inkOn } from "@/lib/group-look";
import type { Group } from "@/lib/groups";

/**
 * Chapter group card — Figma component 178:5933 (instances 205:7820…7823).
 *
 * Since testing (2 Oct 2026) the whole card is the group's flat colour with
 * its line-art in place of the glyph; text and actions take dark ink, or
 * white on a dark colour. Art, title, phase badge, the member stack with its blurb and the group's
 * description, with "Admin" and "Read More" stacked down the right edge. The
 * "Show Button" property gates the Admin action, which the screen's Admin Mode
 * toggle drives. Before you're in, the right edge carries "Join" — which joins
 * an open group or sends a request to one an admin reviews.
 */
export function GroupCard({
  group,
  adminMode = false,
  pendingRequests = 0,
}: {
  group: Group;
  adminMode?: boolean;
  /** Join requests waiting on this admin (PRD §8 "Admin pending approvals"). */
  pendingRequests?: number;
}) {
  const toast = useToast();
  const [requested, setRequested] = useState(group.requestPending);
  const [pending, startTransition] = useTransition();
  const member = group.myRole !== null;
  const extra = group.memberCount - group.memberAvatars.length;
  const { ink, paper, muted } = inkOn(group.color);
  // Text actions sit on the card colour, so they take its ink, not orange.
  const action = "rounded-full px-3 py-2.5 font-ui text-sm font-semibold transition-colors hover:bg-[var(--card-paper)]";

  return (
    <article
      className="flex gap-3 rounded-xl p-4"
      style={{ backgroundColor: group.color, color: ink, "--card-paper": paper } as React.CSSProperties}
    >
      <GroupArt art={group.art} ink={ink} paper={paper} className="size-14 sm:size-16" />

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <h2 className="font-display text-base leading-tight font-bold">
          <Link href={`/groups/${group.slug}`} className="hover:underline">
            {group.title}
          </Link>
        </h2>

        {group.label && (
          <span className="w-fit rounded-full px-2 py-1 font-sans text-xs font-semibold" style={{ backgroundColor: paper }}>
            {group.label}
          </span>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <span className="flex">
            {group.memberAvatars.map((src, i) => (
              <span
                key={`${src}-${i}`}
                className="rounded-full border-2"
                style={{ marginLeft: i === 0 ? 0 : -8, borderColor: group.color }}
              >
                <Avatar src={src} name="" sizes="32px" className="size-7" />
              </span>
            ))}
            {(extra > 0 || group.memberAvatars.length === 0) && (
              <span
                className="grid size-8 place-items-center rounded-full border-2 font-sans text-xs font-extrabold"
                style={{ marginLeft: group.memberAvatars.length ? -8 : 0, borderColor: group.color, backgroundColor: paper }}
              >
                {group.memberAvatars.length ? `+${extra}` : group.memberCount}
              </span>
            )}
          </span>
          <span className="font-sans text-xs font-medium" style={{ color: muted }}>
            {group.memberCount === 1 ? "1 member" : `${group.memberCount} members`}
          </span>
        </div>

        {/* Figma sets the description in italics on every card instance. */}
        {group.description && (
          <p className="line-clamp-3 font-sans text-xs italic" style={{ color: muted }}>
            {group.description}
          </p>
        )}
      </div>

      <div className="flex shrink-0 flex-col items-end justify-between gap-2">
        {member ? (
          <>
            {adminMode && group.myRole === "admin" ? (
              <Button
                variant="secondary"
                size="sm"
                href={`/groups/${group.slug}`}
                className="bg-ivory-500 px-3 py-2.5 text-sm text-ink-600 hover:bg-ivory-600"
                aria-label={pendingRequests ? `Admin, ${pendingRequests} waiting` : undefined}
              >
                Admin
                {pendingRequests > 0 && (
                  <span className="ml-1 grid min-w-5 place-items-center rounded-full bg-primary-500 px-1.5 font-sans text-xs font-semibold text-white">
                    {pendingRequests}
                  </span>
                )}
              </Button>
            ) : (
              <span />
            )}
            <Link
              href={`/groups/${group.slug}`}
              className={`flex items-center gap-2 ${action}`}
            >
              Read More
              <ArrowRight className="size-4" />
            </Link>
          </>
        ) : requested ? (
          <Link
            href={`/groups/${group.slug}`}
            className={action}
            style={{ color: muted }}
          >
            Requested
          </Link>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await joinGroup(group.id);
                if (result.error) {
                  toast({ title: result.error, tone: "danger" });
                  return;
                }
                if (result.status === "requested") {
                  setRequested(true);
                  toast({ title: "Request sent", description: "An admin will review it." });
                } else {
                  toast({ title: `You joined ${group.title}` });
                }
              })
            }
            className={`flex items-center gap-2 ${action} disabled:opacity-60`}
          >
            Join
            <ArrowRight className="size-4" />
          </button>
        )}
      </div>
    </article>
  );
}
