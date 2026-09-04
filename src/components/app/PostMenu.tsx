"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import { CHAPTERS } from "@/lib/chapters";

/**
 * Post overflow menu — Figma frame 115:6523. 245px, 8px radius, 36px blur
 * shadow, two groups split by a divider; the destructive group is
 * Destructive/60.
 */
const GROUP_ONE = [
  { label: "Edit Post", danger: false },
  { label: "Send to a Bond", danger: false },
];

const GROUP_TWO = [
  { label: "Delete Post", danger: true },
  { label: "Report Post", danger: true },
];

export function PostMenu({ onClose }: { onClose: () => void }) {
  const ref = useDismiss(onClose);

  return (
    <div
      ref={ref}
      role="menu"
      className="absolute top-full right-0 z-20 mt-1 flex w-[245px] flex-col items-center gap-2.5 rounded-lg bg-white py-4 shadow-[0px_0px_36px_0px_rgba(0,0,0,0.15)]"
    >
      <MenuGroup items={GROUP_ONE} />
      <hr className="w-[225px] border-ink-50" />
      <MenuGroup items={GROUP_TWO} />
    </div>
  );
}

function MenuGroup({
  items,
}: {
  items: { label: string; danger: boolean }[];
}) {
  return (
    <div className="flex w-full flex-col">
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          role="menuitem"
          className={cn(
            "px-5 py-2 text-left font-sans text-sm font-medium transition-colors hover:bg-ivory-200",
            item.danger ? "text-destructive-60" : "text-ink-500",
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

/**
 * "Posting to" chapter picker — Figma frame 110:3828. Same 245px shell with a
 * POSTING TO label, a tinted chapter dot per row and a check on the current one.
 */
export function PostingToMenu({
  value,
  onSelect,
  onClose,
}: {
  value: string;
  onSelect: (slug: string) => void;
  onClose: () => void;
}) {
  const ref = useDismiss(onClose);
  // Figma lists four of the eight chapters in this menu.
  const shown = CHAPTERS.filter((c) =>
    ["career", "adventure", "health", "spiritual"].includes(c.slug),
  );

  return (
    <div
      ref={ref}
      role="menu"
      className="absolute top-full left-0 z-20 mt-1 flex w-[245px] flex-col rounded-lg bg-white py-2 shadow-[0px_0px_36px_0px_rgba(0,0,0,0.15)]"
    >
      <p className="px-5 py-2 font-sans text-xs font-medium tracking-wide text-ink-300 uppercase">
        Posting to
      </p>
      {shown.map((chapter) => (
        <button
          key={chapter.slug}
          type="button"
          role="menuitemradio"
          aria-checked={value === chapter.slug}
          onClick={() => {
            onSelect(chapter.slug);
            onClose();
          }}
          className="flex items-center gap-3 px-5 py-2 text-left transition-colors hover:bg-ivory-200"
        >
          <span
            className="grid size-6 shrink-0 place-items-center rounded-full"
            style={{ backgroundColor: chapter.tint }}
          />
          <span className="flex-1 font-sans text-sm font-medium text-ink-500">
            {chapter.name}
          </span>
          {value === chapter.slug && (
            <CheckIcon className="size-5 shrink-0 text-primary-500" />
          )}
        </button>
      ))}
    </div>
  );
}

/** Closes the menu on outside click or Escape. */
function useDismiss(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPointer = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    // Deferred so the click that opened the menu doesn't immediately close it.
    const id = setTimeout(() => document.addEventListener("mousedown", onPointer));
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(id);
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return ref;
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path
        d="m4 10.5 4 4 8-9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
