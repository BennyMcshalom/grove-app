"use client";

import Link from "next/link";
import { PersonRowsSkeleton } from "@/components/ui/Skeleton";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/app/Avatar";
import { ChapterGroupCard, GROUP_GRADIENT } from "@/components/app/ChapterGroupCard";
import { useIsOnline } from "@/components/app/Presence";
import { useToast } from "@/components/app/ToastProvider";
import { ArrowRight } from "@/components/ui/ArrowRight";
import { loadSuggestedGroups } from "@/app/(app)/groups/actions";
import { cancelConnectionRequest, connectWith, loadRail } from "@/lib/bond-actions";
import type { BondPerson, Suggestion } from "@/lib/bonds";
import { getChapter } from "@/lib/chapters";
import type { Group } from "@/lib/groups";
import type { Aura } from "@/lib/profile";

/**
 * Figma draws four aura rings (amber, dashed purple, lime, amber) without
 * naming them; each aura gets one of those treatments, plus two more.
 */
const AURA_RING: Record<Aura, { color?: string; dashed?: string; glow: string }> = {
  in_transition: { color: "#F0B231", glow: "0px 2px 9px 9px rgba(251, 148, 31, 0.45)" },
  open_to_connect: { dashed: "#6C35D1", glow: "0px 4px 5px 15px rgba(108, 2, 238, 0.3)" },
  reflective: { color: "#C0CA1E", glow: "0px 2px 9px 9px rgba(120, 238, 2, 0.45)" },
  deep_focus: { color: "#02D6EE", glow: "0px 2px 9px 9px rgba(2, 214, 238, 0.35)" },
  active_nearby: { color: "#F57E16", glow: "0px 2px 9px 9px rgba(245, 126, 22, 0.45)" },
};

export interface RailMember {
  userId: string;
  name: string;
  avatarUrl: string | null;
  phase: string | null;
  chapterSlug?: string | null;
  aura?: Aura;
}

/**
 * Right rail — Figma frame 94:2684. 396px column, 332px content, scrolls on
 * its own: Your Circle, Active Bonds, Chapter Groups and Suggested for you.
 *
 * Loads its people and groups after the page renders so no screen waits on
 * the rail.
 */
export function RightRail({
  variant = "feed",
  spaceMembers,
}: {
  /**
   * The space detail rail (172:6133) swaps "Your circle" for "IN THIS SPACE"
   * and drops Active bonds.
   */
  variant?: "feed" | "space";
  /** For the space variant: the people holding that space. */
  spaceMembers?: RailMember[];
} = {}) {
  const [rail, setRail] = useState<{ people: BondPerson[]; suggestions: Suggestion[] } | null>(null);
  const [groups, setGroups] = useState<Group[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadRail().then((result) => {
      if (!cancelled) setRail(result);
    });
    loadSuggestedGroups(2).then((result) => {
      if (!cancelled) setGroups(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const circle: RailMember[] =
    variant === "space" ? (spaceMembers ?? []) : (rail?.people ?? []);
  const bonds = (rail?.people ?? []).filter((p) => p.relationship === "bond").slice(0, 3);
  const loading = rail === null && variant === "feed";

  return (
    <aside className="hidden w-[396px] shrink-0 scroll-slim overflow-y-auto bg-surface shadow-[0px_1px_2px_0px_rgba(23,23,23,0.05)] xl:block">
      <div className="flex w-full flex-col gap-7 px-8 pt-6 pb-10">
        <Section
          title={variant === "space" ? "In this space" : "Your circle"}
          action="View all"
          href={variant === "space" ? "/spaces" : "/bonds"}
        >
          {loading ? (
            <Placeholder />
          ) : circle.length === 0 ? (
            <Empty>
              {variant === "space"
                ? "No one else holds this space yet."
                : "Your circle fills up as you connect with people."}
            </Empty>
          ) : (
            <ul className="flex flex-col gap-4">
              {circle.slice(0, 4).map((p) => (
                <li key={p.userId}>
                  <Link
                    href={variant === "space" ? "/spaces" : `/bonds?with=${p.userId}`}
                    className="flex items-center gap-6 rounded-lg p-2 transition-colors hover:bg-ivory-100"
                  >
                    <AuraAvatar src={p.avatarUrl} name={p.name} aura={p.aura ?? "in_transition"} />
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="truncate font-sans text-base font-medium text-ink-700">
                        {p.name}
                      </span>
                      {p.phase && <StatusBadge chapterSlug={p.chapterSlug}>{p.phase}</StatusBadge>}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {variant === "feed" && <Divider />}

        {variant === "feed" && (
        <Section title="Active bonds" action="View all" href="/bonds">
          {loading ? (
            <Placeholder />
          ) : bonds.length === 0 ? (
            <Empty>No bonds yet.</Empty>
          ) : (
            <ul className="flex flex-col gap-5">
              {bonds.map((p) => (
                <li key={p.userId}>
                  <Link
                    href={`/bonds?with=${p.userId}`}
                    className="flex items-center gap-4 rounded-lg transition-colors hover:bg-ivory-100"
                  >
                    <BondAvatar userId={p.userId} src={p.avatarUrl} name={p.name} />
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="truncate font-sans text-base font-medium text-ink-700">
                        {p.name}
                      </span>
                      <span className="truncate font-sans text-sm text-ink-200">
                        {p.lastMessage?.preview || `Say hello to ${p.name}`}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Section>
        )}

        <Divider />

        <Section title="Chapter groups" action="Browse" href="/groups">
          {groups === null ? (
            <Placeholder />
          ) : groups.length === 0 ? (
            <Empty>Groups in your chapters show up here.</Empty>
          ) : (
            <ul className="flex flex-col gap-2">
              {groups.map((g, i) => (
                <li key={g.id}>
                  <ChapterGroupCard
                    title={g.title}
                    blurb={g.label}
                    href={`/groups/${g.slug}`}
                    avatars={g.memberAvatars}
                    memberCount={g.memberCount}
                    gradient={i === 0 ? GROUP_GRADIENT.orange : GROUP_GRADIENT.pink}
                  />
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Divider />

        <Section title="Suggested for you" action="View all" href="/bonds">
          {rail === null ? (
            <Placeholder />
          ) : rail.suggestions.length === 0 ? (
            <Empty>Suggestions show up as your spaces fill up.</Empty>
          ) : (
            <ul
              className="flex flex-col gap-4 rounded-2xl p-4"
              style={{ backgroundImage: GROUP_GRADIENT.orange }}
            >
              {rail.suggestions.map((p, i) => (
                <li key={p.userId} className="flex flex-col gap-4">
                  {i > 0 && <hr className="border-ink-50" />}
                  <div className="flex items-center justify-between gap-4">
                    <span className="flex min-w-0 items-center gap-4">
                      {/* Avatar 5 (94:3417) — 40px on a 5px white ring. */}
                      <span className="shrink-0 rounded-full ring-[5px] ring-white">
                        <Avatar src={p.avatarUrl} name={p.name} className="size-10" />
                      </span>
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate font-sans text-base font-medium text-ink-700">
                          {p.name}
                        </span>
                        <span className="truncate font-sans text-sm font-medium text-primary-700">
                          Also in {getChapter(p.sharedChapter)?.name ?? "your space"}
                        </span>
                      </span>
                    </span>
                    <InviteButton userId={p.userId} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </aside>
  );
}

function Section({
  title,
  action,
  href,
  children,
}: {
  title: string;
  action: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-sans text-base font-medium tracking-wide text-ink-700 uppercase">
          {title}
        </h2>
        <Link
          href={href}
          className="font-sans text-sm font-medium text-primary-500 hover:underline"
        >
          {action}
        </Link>
      </div>
      {children}
    </section>
  );
}

function Placeholder() {
  return <PersonRowsSkeleton count={3} />;
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="font-sans text-sm text-ink-300">{children}</p>;
}

/**
 * Invite flips to "Invited" — Figma's alert for this action is
 * "Connection request sent" (285:9289). Until it's answered, "Invited" takes
 * the request back.
 */
function InviteButton({ userId }: { userId: string }) {
  const toast = useToast();
  const [state, setState] = useState<"idle" | "busy" | "invited" | "connected">("idle");

  const invite = async () => {
    setState("busy");
    const result = await connectWith(userId);
    if (result.error) {
      setState("idle");
      toast({ title: result.error, tone: "danger" });
      return;
    }
    const connected = result.status === "accepted";
    setState(connected ? "connected" : "invited");
    toast({ title: connected ? "You're connected" : "Connection request sent" });
  };

  const revoke = async () => {
    setState("busy");
    const result = await cancelConnectionRequest(userId);
    if (result.error) {
      setState("invited");
      toast({ title: result.error, tone: "danger" });
      return;
    }
    setState("idle");
    toast({ title: "Invite cancelled" });
  };

  return (
    <button
      type="button"
      onClick={state === "invited" ? revoke : invite}
      disabled={state === "busy" || state === "connected"}
      title={state === "invited" ? "Cancel this invite" : undefined}
      className="group flex shrink-0 items-center gap-2 rounded-full px-3 py-2.5 font-ui text-sm font-medium text-primary-500 transition-colors hover:bg-primary-50 disabled:text-ink-300 disabled:hover:bg-transparent"
    >
      {state === "invited" ? (
        <>
          <span className="group-hover:hidden">Invited</span>
          <span className="hidden group-hover:inline">Cancel invite</span>
          <span aria-hidden="true" className="text-xs">✕</span>
        </>
      ) : state === "connected" ? (
        "Connected"
      ) : (
        <>
          Invite
          {state === "idle" && <ArrowRight className="size-4" />}
        </>
      )}
    </button>
  );
}

function BondAvatar({ userId, src, name }: { userId: string; src: string | null; name: string }) {
  const online = useIsOnline(userId);
  return (
    <span className="relative size-12 shrink-0">
      <Avatar src={src} name={name} sizes="48px" className="size-12" />
      <span className="pointer-events-none absolute inset-0 rounded-full ring-[6px] ring-white ring-inset" />
      {/* _AvatarIndicator 94:2873 — Success/50 at 36,36. */}
      {online && (
        <span className="absolute right-0 bottom-0 size-3 rounded-full border-[1.5px] border-surface bg-success-50" />
      )}
    </span>
  );
}

/** Frames 100:1117 … — a 48px portrait over its owner's coloured aura. */
function AuraAvatar({ src, name, aura }: { src: string | null; name: string; aura: Aura }) {
  const ring = AURA_RING[aura];
  return (
    <span className="relative size-12 shrink-0">
      {ring.dashed ? (
        <span
          className="absolute -inset-1 rounded-full border border-dashed"
          style={{ borderColor: ring.dashed, boxShadow: ring.glow }}
        />
      ) : (
        <span
          className="absolute inset-0 rounded-full"
          style={{ backgroundColor: ring.color, boxShadow: ring.glow }}
        />
      )}
      <Avatar src={src} name={name} sizes="48px" className="relative size-12" />
    </span>
  );
}

/** Badge Text 97:4010 — ivory-200 pill, 4px/12px, with the chapter glyph. */
function StatusBadge({
  chapterSlug,
  children,
}: {
  chapterSlug?: string | null;
  children: React.ReactNode;
}) {
  const icon = chapterSlug ? getChapter(chapterSlug)?.icon : undefined;
  return (
    <span className="flex w-fit items-center gap-2 rounded-full bg-ivory-200 px-3 py-1">
      {icon && (
        <span
          className="size-4 shrink-0 rounded-full bg-contain bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${icon})` }}
        />
      )}
      <span className="truncate font-sans text-xs font-medium text-ink-400">
        {children}
      </span>
    </span>
  );
}

function Divider() {
  return <hr className="border-ink-50" />;
}
