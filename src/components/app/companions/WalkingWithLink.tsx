"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "@/components/ui/ArrowRight";
import { loadWalkingWithCount } from "@/lib/companion-actions";
import { cn } from "@/lib/cn";

/**
 * "Chapters I'm walking with" — the way into the chapters other people have
 * invited you to walk alongside (/bonds/walking-with). On the Bonds list,
 * the Bonds rail and Your Circle.
 */
export function WalkingWithLink({ className }: { className?: string }) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadWalkingWithCount().then((n) => {
      if (!cancelled) setCount(n);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Link
      href="/bonds/walking-with"
      className={cn("flex items-center gap-3 rounded-lg p-3 transition-opacity hover:opacity-90", className)}
      style={{ backgroundImage: "var(--wash-warm)" }}
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface text-primary-600" aria-hidden="true">
        <FootstepsIcon />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-sans text-sm font-semibold text-ink-700">Chapters I&rsquo;m walking with</span>
        <span className="truncate font-sans text-xs text-ink-300">
          {count === null
            ? "People who asked you beside them"
            : count === 0
              ? "None yet — invitations show up here"
              : `${count} ${count === 1 ? "chapter" : "chapters"}`}
        </span>
      </span>
      <ArrowRight className="size-5 shrink-0 text-primary-500" />
    </Link>
  );
}

function FootstepsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-5">
      <ellipse cx="8" cy="7" rx="2.6" ry="3.8" />
      <ellipse cx="8" cy="14.2" rx="1.8" ry="1.4" />
      <ellipse cx="16" cy="11" rx="2.6" ry="3.8" />
      <ellipse cx="16" cy="18.2" rx="1.8" ry="1.4" />
    </svg>
  );
}
