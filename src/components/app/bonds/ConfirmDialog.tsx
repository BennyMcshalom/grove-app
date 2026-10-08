"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { ModalClose } from "@/components/ui/Modal";
import { cn } from "@/lib/cn";

/**
 * The Bonds / Home confirmation dialogs (Figma 1610:36719 Mute, 1610:39648
 * Release, 1610:39615 Block, 1776:27862 Delete message, 1689:44046 Block
 * Priya): × top right, a title, one paragraph, a full-width action and a
 * Cancel link. Plain for Mute, a warm tint for Release, red for anything
 * that can't be undone.
 */
export function ConfirmDialog({
  title,
  children,
  action,
  tone = "plain",
  busy = false,
  onConfirm,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  action: string;
  tone?: "plain" | "warning" | "danger";
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
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
      className="fixed inset-0 z-[55] flex items-center justify-center scroll-slim overflow-y-auto bg-ink-900/40 p-4"
      onClick={onClose}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "flex w-full max-w-[500px] flex-col gap-6 rounded-2xl border p-6 sm:p-8",
          tone === "danger"
            ? "border-destructive-60 bg-destructive-5"
            : tone === "warning"
              ? "border-warning-50 bg-warning-5"
              : "border-transparent bg-surface",
        )}
      >
        <div className="flex flex-col gap-3">
          <ModalClose onClose={onClose} className="self-end bg-surface" />
          <h2 className="font-display text-2xl font-semibold text-ink-800">{title}</h2>
          <p className="font-sans text-sm leading-6 text-ink-500">{children}</p>
        </div>
        <div className="flex flex-col items-center gap-3">
          {tone === "danger" ? (
            <button
              type="button"
              onClick={onConfirm}
              disabled={busy}
              aria-busy={busy || undefined}
              className="w-full rounded-pill bg-destructive-60 px-3 py-2.5 font-ui text-sm font-medium text-white transition-colors hover:bg-destructive-50 active:bg-destructive-70 disabled:opacity-60"
            >
              {busy ? "…" : action}
            </button>
          ) : (
            <Button size="sm" fullWidth loading={busy} onClick={onConfirm}>
              {action}
            </Button>
          )}
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "rounded px-3 py-1.5 font-sans text-sm font-medium hover:underline",
              tone === "danger" ? "text-destructive-60" : "text-primary-800",
            )}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
