"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { cn } from "@/lib/cn";

/**
 * How many pages deep this tab is inside Grouv. A back arrow can only
 * `router.back()` safely when the previous page was ours — a fresh tab, a
 * shared link or a reload starts at 0 and uses the fallback instead.
 */
const DEPTH_KEY = "grouv-nav-depth";

/** Counts in-app navigations; mounted once in the (app) layout. */
export function NavDepthTracker() {
  const pathname = usePathname();
  useEffect(() => {
    try {
      const seen = sessionStorage.getItem(DEPTH_KEY);
      sessionStorage.setItem(DEPTH_KEY, seen === null ? "0" : String(Number(seen) + 1));
    } catch {}
  }, [pathname]);
  return null;
}

/**
 * The header's back arrow: back to wherever they came from inside Grouv,
 * else to `fallback` (the screen's natural parent).
 */
export function BackButton({ fallback, className }: { fallback: string; className?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      aria-label="Back"
      onClick={() => {
        let depth = 0;
        try {
          depth = Number(sessionStorage.getItem(DEPTH_KEY) ?? 0);
          if (depth > 0) sessionStorage.setItem(DEPTH_KEY, String(depth - 2));
        } catch {}
        if (depth > 0) router.back();
        else router.push(fallback);
      }}
      className={cn("shrink-0 text-ink-800", className)}
    >
      <svg viewBox="0 0 24 24" fill="none" className="size-6" aria-hidden="true">
        <path
          d="M19 12H5m0 0 6-6m-6 6 6 6"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

/**
 * Top-level destinations (the sidebar and tab bar) have no back arrow; any
 * page below one gets an arrow back to its parent by default.
 */
export function defaultBack(pathname: string): string | undefined {
  if (pathname === "/search") return "/home";
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length < 2) return undefined;
  if (parts[0] === "people" || parts[0] === "posts" || parts[0] === "walking") return "/home";
  return `/${parts.slice(0, -1).join("/")}`;
}
