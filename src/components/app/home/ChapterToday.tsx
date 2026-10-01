"use client";

import Link from "next/link";
import { WrappedReadyCard } from "@/components/app/wrapped/WrappedReadyCard";
import type { Introduction } from "@/lib/matches";
import type { WrapSummary } from "@/lib/wrapped";

/** Accepted introductions stay on Home for a week. */
const REPLY_WINDOW_MS = 7 * 86_400_000;

/**
 * Chapter Today (PRD §5) — the orange cards at the top of Home, Figma
 * 1338:28137 and h00: timely replies to introductions, an introduction
 * waiting on you, Wrapped readiness (Workstream B's WrappedReadyCard) and
 * match activity. Nothing shows when there's nothing timely.
 */
export function ChapterToday({
  introductions,
  matchCount,
  wrap,
  onOpenIntro,
  onOpenMatches,
}: {
  introductions: Introduction[];
  matchCount: number;
  wrap: Pick<WrapSummary, "id" | "range"> | null;
  onOpenIntro: (intro: Introduction) => void;
  onOpenMatches: () => void;
}) {
  // Rendered, so the week's window is measured once per page load.
  // eslint-disable-next-line react-hooks/purity -- a render-time clock is fine for "this week"
  const now = Date.now();
  const waiting = introductions.filter((i) => i.direction === "received" && i.status === "pending").slice(0, 2);
  const replies = introductions
    .filter(
      (i) =>
        i.direction === "sent" &&
        i.status === "accepted" &&
        i.respondedAt &&
        now - new Date(i.respondedAt).getTime() < REPLY_WINDOW_MS,
    )
    .slice(0, 2);

  if (waiting.length === 0 && replies.length === 0 && !wrap && matchCount === 0) return null;

  return (
    <section aria-label="Chapter today" className="flex flex-col gap-4">
      {replies.map((intro) => (
        <TodayCard
          key={intro.connectionId}
          icon={<ChatIcon />}
          title={`${intro.name} replied to your introduction.`}
          body="You’re now connected. You can now start your conversation."
          action={{ label: "Open conversation", href: `/bonds?with=${intro.userId}` }}
        />
      ))}
      {waiting.map((intro) => (
        <TodayCard
          key={intro.connectionId}
          icon={<ChatIcon />}
          title={`${intro.name} introduced themselves`}
          body={intro.message ? `“${truncate(intro.message, 90)}”` : "They’d like to connect."}
          action={{ label: "View introduction", onClick: () => onOpenIntro(intro) }}
        />
      ))}
      {wrap && <WrappedReadyCard wrap={wrap} />}
      {matchCount > 0 && (
        <TodayCard
          icon={<PeopleIcon />}
          title="We found some potential connections"
          body={`${matchCount === 1 ? "Someone" : `${matchCount} people`} who may be a good fit for where you are right now.`}
          action={{ label: "See matches", onClick: onOpenMatches }}
        />
      )}
    </section>
  );
}

function truncate(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

/** One orange banner — the shape WrappedReadyCard uses, so they stack evenly. */
function TodayCard({
  icon,
  title,
  body,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  action: { label: string; href?: string; onClick?: () => void };
}) {
  const button =
    "relative shrink-0 rounded-full bg-surface px-4 py-2 font-ui text-sm font-medium text-primary-800 transition-colors hover:bg-primary-50";
  return (
    <article className="relative flex flex-wrap items-center gap-4 overflow-hidden rounded-2xl bg-primary-600 px-5 py-5 sm:flex-nowrap sm:px-6">
      <span className="relative grid size-11 shrink-0 place-items-center rounded-full bg-primary-100 text-primary-700">
        {icon}
      </span>
      <span className="relative flex min-w-0 flex-1 flex-col gap-1">
        <span className="font-display text-lg font-semibold text-white">{title}</span>
        <span className="font-sans text-sm text-white/80">{body}</span>
      </span>
      {action.href ? (
        <Link href={action.href} className={button}>
          {action.label}
        </Link>
      ) : (
        <button type="button" onClick={action.onClick} className={button}>
          {action.label}
        </button>
      )}
    </article>
  );
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-5" aria-hidden="true">
      <path
        d="M12 4a8 8 0 0 0-6.9 12L4 20l4.1-1.1A8 8 0 1 0 12 4Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-5" aria-hidden="true">
      <circle cx="9" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path
        d="M16 5.2a3.2 3.2 0 0 1 0 5.6M17 14.2a5.5 5.5 0 0 1 3.5 4.8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
