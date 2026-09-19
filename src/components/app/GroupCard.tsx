"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Avatar } from "@/components/app/Avatar";
import { useToast } from "@/components/app/ToastProvider";
import { Button } from "@/components/ui/Button";
import { ArrowRight } from "@/components/ui/ArrowRight";
import { joinGroup } from "@/app/(app)/groups/actions";
import type { Group } from "@/lib/groups";

/**
 * Chapter group card — Figma component 178:5933 (instances 205:7820…7823).
 *
 * Glyph, title, phase badge, the member stack with its blurb and the group's
 * description, with "Admin" and "Read More" stacked down the right edge. The
 * "Show Button" property gates the Admin action, which the screen's Admin Mode
 * toggle drives. Before you're in, the right edge carries "Join" — which joins
 * an open group or sends a request to one an admin reviews.
 */
export function GroupCard({
  group,
  adminMode = false,
}: {
  group: Group;
  adminMode?: boolean;
}) {
  const toast = useToast();
  const [requested, setRequested] = useState(group.requestPending);
  const [pending, startTransition] = useTransition();
  const member = group.myRole !== null;
  const extra = group.memberCount - group.memberAvatars.length;

  return (
    <article className="flex gap-2 rounded-lg bg-surface p-4">
      <span
        className="grid size-8 shrink-0 place-items-center rounded-full text-primary-600"
        style={{ backgroundColor: group.color }}
      >
        <span
          className="size-4 bg-current"
          style={{
            maskImage: `url(/icons/events/${group.icon}.svg)`,
            WebkitMaskImage: `url(/icons/events/${group.icon}.svg)`,
            maskSize: "contain",
            WebkitMaskSize: "contain",
            maskRepeat: "no-repeat",
            WebkitMaskRepeat: "no-repeat",
            maskPosition: "center",
            WebkitMaskPosition: "center",
          }}
        />
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <h2 className="font-sans text-sm font-semibold text-ink-600">
          <Link href={`/groups/${group.slug}`} className="hover:underline">
            {group.title}
          </Link>
        </h2>

        {group.label && (
          <span className="w-fit rounded-full bg-ivory-500 p-2 font-sans text-xs font-semibold text-ink-300">
            {group.label}
          </span>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <span className="flex">
            {group.memberAvatars.map((src, i) => (
              <span
                key={`${src}-${i}`}
                className="rounded-full border-2 border-surface"
                style={{ marginLeft: i === 0 ? 0 : -8 }}
              >
                <Avatar src={src} name="" sizes="32px" className="size-7" />
              </span>
            ))}
            {(extra > 0 || group.memberAvatars.length === 0) && (
              <span
                className="grid size-8 place-items-center rounded-full border-2 border-surface bg-primary-50 font-sans text-xs font-extrabold text-primary-600"
                style={{ marginLeft: group.memberAvatars.length ? -8 : 0 }}
              >
                {group.memberAvatars.length ? `+${extra}` : group.memberCount}
              </span>
            )}
          </span>
          <span className="font-sans text-xs text-ink-400">
            {group.memberCount === 1 ? "1 member" : `${group.memberCount} members`}
          </span>
        </div>

        {/* Figma sets the description in italics on every card instance. */}
        {group.description && (
          <p className="line-clamp-3 font-sans text-xs text-ink-400 italic">
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
              >
                Admin
              </Button>
            ) : (
              <span />
            )}
            <Link
              href={`/groups/${group.slug}`}
              className="flex items-center gap-2 rounded-full px-3 py-2.5 font-ui text-sm text-primary-600 transition-colors hover:bg-primary-50"
            >
              Read More
              <ArrowRight className="size-4" />
            </Link>
          </>
        ) : requested ? (
          <Link
            href={`/groups/${group.slug}`}
            className="rounded-full px-3 py-2.5 font-ui text-sm text-ink-300 hover:bg-ivory-100"
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
            className="flex items-center gap-2 rounded-full px-3 py-2.5 font-ui text-sm text-primary-600 transition-colors hover:bg-primary-50 disabled:opacity-60"
          >
            Join
            <ArrowRight className="size-4" />
          </button>
        )}
      </div>
    </article>
  );
}
