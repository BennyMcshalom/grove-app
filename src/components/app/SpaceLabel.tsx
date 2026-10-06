"use client";

import Image from "next/image";
import { useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";
import { getChapter, spaceAccentClass } from "@/lib/chapters";

/**
 * Where a post or Curio card is from, said in words (testing feedback, 6 Oct:
 * the wash alone didn't tell anyone which Space a sky-blue card was). Two
 * designs to try on the live app, picked per person in Settings → Appearance:
 *
 *   banner (A) — the card sits in a frame of its Space's accent, with the name
 *                in caps across the top strip, like a folder tab.
 *   tag    (B) — a small accent chip above the card's top-left edge.
 *
 * The choice is a per-device trial, so it lives in localStorage, not the DB.
 */
export type SpaceLabelStyle = "banner" | "tag";

const KEY = "grouv-post-labels";
const EVENT = "grouv-post-labels";
const DEFAULT: SpaceLabelStyle = "tag";

function read(): SpaceLabelStyle {
  try {
    return window.localStorage.getItem(KEY) === "banner" ? "banner" : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

function subscribe(onChange: () => void) {
  // `storage` covers other tabs; the custom event covers this one.
  window.addEventListener("storage", onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(EVENT, onChange);
  };
}

export function useSpaceLabelStyle(): SpaceLabelStyle {
  return useSyncExternalStore(subscribe, read, () => DEFAULT);
}

export function setSpaceLabelStyle(style: SpaceLabelStyle) {
  try {
    window.localStorage.setItem(KEY, style);
  } catch {
    // Private mode: the switch just won't stick.
  }
  window.dispatchEvent(new Event(EVENT));
}

/**
 * Wraps a card with its Space label. With no Space (Wander) the card comes
 * back untouched — or, with `keepRow`, behind an invisible tag so it lines up
 * with labelled cards beside it. In banner mode the card inside should use a
 * smaller radius (rounded-xl) to nest in the frame; `useSpaceLabelStyle`
 * tells the card which mode it is in.
 */
export function SpaceFrame({
  slug,
  keepRow = false,
  className,
  children,
}: {
  slug: string | null | undefined;
  keepRow?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const style = useSpaceLabelStyle();
  const chapter = slug ? getChapter(slug) : undefined;
  const accent = spaceAccentClass(slug);

  if (!chapter || !accent) {
    if (!keepRow) return <>{children}</>;
    return (
      <div className={cn("flex flex-col items-start gap-1.5", className)}>
        {style === "tag" && (
          <span aria-hidden="true" className="invisible flex items-center py-1 font-sans text-xs">
            <span className="size-4" />
          </span>
        )}
        <div className="flex w-full flex-1 flex-col">{children}</div>
      </div>
    );
  }

  if (style === "banner") {
    return (
      <div className={cn("flex flex-col rounded-2xl p-1 pt-0", accent, className)}>
        <span className="flex items-center justify-center gap-1.5 py-1.5 font-sans text-xs font-semibold tracking-wider text-white uppercase">
          <SpaceIcon src={chapter.icon} />
          {chapter.name}
        </span>
        <div className="flex w-full flex-1 flex-col">{children}</div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-start gap-1.5", className)}>
      <span
        className={cn(
          "ml-1 flex items-center gap-1.5 rounded-full py-1 pr-2.5 pl-1 font-sans text-xs font-semibold text-white",
          accent,
        )}
      >
        <SpaceIcon src={chapter.icon} />
        {chapter.name}
      </span>
      <div className="flex w-full flex-1 flex-col">{children}</div>
    </div>
  );
}

function SpaceIcon({ src }: { src: string }) {
  // The Space glyph on its own pastel disc, as everywhere else in the app.
  return <Image src={src} alt="" width={56} height={56} className="size-4 shrink-0" />;
}
