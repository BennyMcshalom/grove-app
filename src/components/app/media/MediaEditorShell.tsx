"use client";

import { useEffect } from "react";
import { cn } from "@/lib/cn";

/**
 * The frame both media editors sit in.
 *
 * Editing media is a full-screen job, the way it is in X, LinkedIn and
 * WhatsApp: the picture or clip gets the whole dark canvas, the way out is
 * top-left, the way forward is top-right, and the tools sit along the bottom
 * where a thumb can reach them. The chrome stays dark in both themes — you
 * judge a photo against black, not against the page.
 */
export function MediaEditorShell({
  title,
  onCancel,
  onDone,
  doneLabel = "Done",
  doneDisabled = false,
  busy = false,
  toolbar,
  children,
}: {
  title: string;
  onCancel: () => void;
  onDone: () => void;
  doneLabel?: string;
  doneDisabled?: boolean;
  busy?: boolean;
  toolbar: React.ReactNode;
  children: React.ReactNode;
}) {
  // Escape closes, and the page behind mustn't scroll while this is open.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onCancel]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[70] flex flex-col bg-[#0c0c10] text-white"
    >
      <header className="flex shrink-0 items-center justify-between gap-3 px-4 py-3">
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancel"
          className="grid size-10 place-items-center rounded-full text-white/90 transition-colors hover:bg-white/10"
        >
          <svg viewBox="0 0 24 24" fill="none" className="size-6" aria-hidden="true">
            <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        <span className="font-sans text-sm font-medium text-white/70">{title}</span>

        <button
          type="button"
          onClick={onDone}
          disabled={doneDisabled || busy}
          className={cn(
            "rounded-full bg-primary-500 px-5 py-2 font-ui text-sm font-semibold text-white transition-colors",
            "hover:bg-primary-400 disabled:cursor-not-allowed disabled:bg-white/15 disabled:text-white/40",
          )}
        >
          {busy ? "Saving…" : doneLabel}
        </button>
      </header>

      <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden px-4">{children}</div>

      <footer className="shrink-0 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">{toolbar}</footer>
    </div>
  );
}

/** A row of choices — aspect ratios, and anything else that picks one of a set. */
export function ToolChips<T extends string | number | null>({
  options,
  value,
  onChange,
  label,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="scroll-slim flex gap-2 overflow-x-auto pb-1">
      {options.map((option) => (
        <button
          key={option.label}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          onClick={() => onChange(option.value)}
          className={cn(
            "shrink-0 rounded-full px-4 py-2 font-sans text-sm transition-colors",
            option.value === value ? "bg-white text-ink-700" : "bg-white/10 text-white/80 hover:bg-white/20",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/** A round icon button for the editor's secondary tools. */
export function ToolButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid size-10 shrink-0 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
    >
      {children}
    </button>
  );
}
