"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * True once `target` (the "What's on your mind?" bar) has scrolled out of
 * view, so a + button can take its place.
 */
export function useScrolledPast(target: React.RefObject<HTMLElement | null>) {
  const [past, setPast] = useState(false);
  useEffect(() => {
    const el = target.current;
    if (!el) return;
    // A null root still clips by the scrolling column the bar sits in.
    const observer = new IntersectionObserver(([entry]) => setPast(!entry.isIntersecting));
    observer.observe(el);
    return () => observer.disconnect();
  }, [target]);
  return past;
}

/**
 * The + that opens the composer once the post bar is out of sight. It sits at
 * the end of the feed column and sticks to the bottom of the view, so it
 * lines up with the feed on desktop and clears the phone tab bar.
 */
export function FloatingCompose({ visible, onClick }: { visible: boolean; onClick: () => void }) {
  return (
    <div className="pointer-events-none sticky bottom-6 z-30 -mt-12 flex justify-end">
      <button
        type="button"
        onClick={onClick}
        aria-label="Start a conversation"
        tabIndex={visible ? 0 : -1}
        aria-hidden={!visible}
        className={cn(
          "grid size-12 place-items-center rounded-full bg-ink-800 text-white shadow-[0px_6px_20px_0px_rgba(0,0,0,0.18)] transition-all duration-200 hover:bg-ink-700",
          visible ? "pointer-events-auto translate-y-0 opacity-100" : "translate-y-3 opacity-0",
        )}
      >
        <svg viewBox="0 0 24 24" fill="none" className="size-6" aria-hidden="true">
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
