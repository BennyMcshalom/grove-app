"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/app/Avatar";
import { ArrowRight } from "@/components/ui/ArrowRight";
import { loadCompanionCounts } from "@/lib/companion-actions";

type Counts = Awaited<ReturnType<typeof loadCompanionCounts>>;

/**
 * The Companions line on your own Space page: who walks alongside this
 * chapter (and invitations out), leading to /spaces/<chapter>/companions.
 */
export function SpaceCompanionsStrip({ slug, userChapterId }: { slug: string; userChapterId: string }) {
  const [counts, setCounts] = useState<Counts | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadCompanionCounts(userChapterId).then((c) => {
      if (!cancelled) setCounts(c);
    });
    return () => {
      cancelled = true;
    };
  }, [userChapterId]);

  if (!counts) return null;
  const label =
    counts.companions > 0
      ? `${counts.companions} ${counts.companions === 1 ? "person walks" : "people walk"} with you`
      : counts.pending > 0
        ? `${counts.pending} ${counts.pending === 1 ? "invitation" : "invitations"} waiting`
        : "Invite someone to walk with you";

  return (
    <Link
      href={`/spaces/${slug}/companions`}
      className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-opacity hover:opacity-90"
      style={{ backgroundImage: "var(--wash-warm)" }}
    >
      {counts.faces.length > 0 && (
        <span className="flex shrink-0">
          {counts.faces.map((f, i) => (
            <span key={f.userId} className="rounded-full border-2 border-surface" style={{ marginLeft: i === 0 ? 0 : -8 }}>
              <Avatar src={f.avatarUrl} name={f.name} sizes="28px" className="size-7" />
            </span>
          ))}
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-sans text-xs font-semibold tracking-wide text-primary-600 uppercase">Companions</span>
        <span className="truncate font-sans text-sm text-ink-600">{label}</span>
      </span>
      <ArrowRight className="size-5 shrink-0 text-primary-500" />
    </Link>
  );
}
