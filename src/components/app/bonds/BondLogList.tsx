"use client";

import Link from "next/link";
import { ChapterBadge, GlowAvatar } from "@/components/app/BondChat";
import { Lock } from "@/components/app/bonds/BondBanner";
import { usePaywall } from "@/components/app/pass/PaywallProvider";
import { useIsOnline } from "@/components/app/Presence";
import { useViewer } from "@/components/app/ViewerProvider";
import type { BondLogSummary } from "@/lib/bonds";
import { cn } from "@/lib/cn";

/**
 * Grouv Log → Bond Log tab — Figma 1232:23130. "Your Bond Logs": every Bond
 * keeping a log with you, whether something new is waiting, and Open Bond Log.
 * The Bond Log is Season Pass; on Free past logs open read-only.
 */
export function BondLogList({ logs }: { logs: BondLogSummary[] }) {
  const { hasPass } = useViewer();
  const paywall = usePaywall();

  return (
    <section className="flex w-full flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h2 className="font-display text-2xl font-semibold text-ink-800">Your Bond Logs</h2>
        <p className="font-sans text-base text-ink-400">
          You’re not just logging with one person, here’s every Bond keeping a log with you
        </p>
      </header>

      {!hasPass && (
        <p className="rounded-2xl bg-surface px-4 py-3 font-sans text-sm text-ink-500">
          The Bond Log is a Season Pass feature — past entries stay readable.{" "}
          <button
            type="button"
            onClick={() => paywall("bond_log")}
            className="font-medium text-primary-600 hover:underline"
          >
            <Lock />
            Unlock Bond Log
          </button>
        </p>
      )}

      {logs.length === 0 ? (
        <p className="rounded-3xl bg-surface px-4 py-6 text-center font-sans text-sm text-ink-300">
          When you have a Bond, your shared log with them lives here.
        </p>
      ) : (
        <ul className="flex flex-col gap-6">
          {logs.map((log) => (
            <li key={log.bondId}>
              <Row log={log} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Row({ log }: { log: BondLogSummary }) {
  const online = useIsOnline(log.userId);
  const status =
    log.status === "released"
      ? { label: "Released · read-only", tone: "text-ink-300", dot: "bg-ink-200" }
      : log.waitingOnMe
        ? { label: `New response from ${log.name}`, tone: "text-primary-600", dot: "bg-primary-500" }
        : { label: "Up to date", tone: "text-success-60", dot: "bg-success-60" };

  return (
    <Link
      href={`/log/bonds/${log.bondId}`}
      className="flex items-center gap-4 rounded-2xl bg-surface px-4 py-5 transition-colors hover:bg-ivory-50"
    >
      <GlowAvatar src={log.avatarUrl} name={log.name} online={online} size={48} />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate font-sans text-base font-medium text-ink-700">{log.name}</span>
        {log.phase && <ChapterBadge chapterSlug={log.chapterSlug} label={log.phase} />}
        <span className={cn("flex items-center gap-2 font-sans text-sm", status.tone)}>
          <span className={cn("size-1.5 rounded-full", status.dot)} />
          {status.label}
        </span>
      </span>
      <span className="hidden shrink-0 items-center gap-1 font-sans text-sm font-medium text-primary-600 sm:flex">
        Open Bond Log <span aria-hidden="true">→</span>
      </span>
    </Link>
  );
}
