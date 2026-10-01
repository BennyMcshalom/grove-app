"use client";

import { useEffect } from "react";
import { cn } from "@/lib/cn";

/**
 * The modal shell every Figma dialog shares: a dimmed backdrop, a white card
 * (660px wide by default, 16–24px radius, 32px padding from sm up), closed by
 * the backdrop, the × or Escape. Same markup as CreateGroupModal.
 */
export function Modal({
  label,
  onClose,
  width = "max-w-[660px]",
  className,
  children,
}: {
  /** Accessible name for the dialog. */
  label: string;
  onClose: () => void;
  /** A Tailwind max-width class; Figma uses 660px, 560px and 480px cards. */
  width?: string;
  className?: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center scroll-slim overflow-y-auto bg-ink-900/40 p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onClick={(e) => e.stopPropagation()}
        className={cn("my-auto flex w-full flex-col gap-6 rounded-2xl bg-surface p-6 sm:p-8", width, className)}
      >
        {children}
      </div>
    </div>
  );
}

/** Title on the left, × on the right — Figma's dialog header. */
export function ModalHeader({ title, onClose }: { title?: React.ReactNode; onClose: () => void }) {
  return (
    <header className="flex items-center justify-between gap-4">
      {title ? <h2 className="font-display text-2xl font-semibold text-ink-800">{title}</h2> : <span />}
      <ModalClose onClose={onClose} />
    </header>
  );
}

export function ModalClose({ onClose, className }: { onClose: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="Close"
      className={cn("rounded p-3 text-ink-800 transition-colors hover:bg-ivory-200", className)}
    >
      <svg viewBox="0 0 24 24" fill="none" className="size-6" aria-hidden="true">
        <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </button>
  );
}

/**
 * The centred status card used across the new flows (Introduction sent,
 * Link ready, Purchase success, We couldn't put this together…): a round
 * peach badge with an icon, a title and one line of copy.
 */
export function ModalStatus({
  icon,
  tone = "primary",
  title,
  children,
}: {
  icon: React.ReactNode;
  tone?: "primary" | "danger";
  title: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-4 text-center">
      <span
        className={cn(
          "grid size-14 place-items-center rounded-full",
          tone === "primary" ? "bg-primary-100 text-primary-600" : "text-primary-600",
        )}
        aria-hidden="true"
      >
        {icon}
      </span>
      <h2 className="font-display text-2xl font-semibold text-ink-800">{title}</h2>
      {children && <div className="max-w-[440px] font-sans text-base text-ink-300">{children}</div>}
    </div>
  );
}
