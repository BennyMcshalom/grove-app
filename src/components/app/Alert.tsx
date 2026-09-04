import { cn } from "@/lib/cn";

/**
 * Alert — Figma component set 115:7025 (instances 115:7166 … 115:7207).
 *
 * 394px card, 16px padding, 8px radius, 1px border, 24px icon beside a
 * title/description column. "confirm" adds a close button and a wider frame.
 */
export type AlertTone = "info" | "danger" | "confirm";

const TONE: Record<AlertTone, string> = {
  info: "bg-primary-50 border-primary-500",
  danger: "bg-destructive-5 border-destructive-60",
  confirm: "bg-destructive-5 border-destructive-60",
};

const ICON_TONE: Record<AlertTone, string> = {
  info: "text-primary-500",
  danger: "text-destructive-60",
  confirm: "text-destructive-60",
};

export function Alert({
  tone = "info",
  title,
  description,
  action,
  onClose,
  className,
}: {
  tone?: AlertTone;
  title: string;
  description?: string;
  action?: string;
  onClose?: () => void;
  className?: string;
}) {
  return (
    <div
      role={tone === "info" ? "status" : "alert"}
      className={cn(
        "flex w-full max-w-[400px] gap-4 rounded-lg border p-4",
        TONE[tone],
        className,
      )}
    >
      <span className={cn("shrink-0", ICON_TONE[tone])}>
        {tone === "info" ? (
          <InfoIcon className="size-6" />
        ) : (
          <ErrorIcon className="size-6" />
        )}
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="font-sans text-sm font-semibold text-ink-800">{title}</p>
        {description && (
          <p className="font-sans text-sm text-ink-400">{description}</p>
        )}
        {action && (
          <button
            type="button"
            className={cn(
              "w-fit font-sans text-sm font-semibold underline",
              tone === "info" ? "text-primary-600" : "text-destructive-70",
            )}
          >
            {action}
          </button>
        )}
      </div>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss"
          className="shrink-0 text-ink-400 transition-colors hover:text-ink-600"
        >
          <CloseIcon className="size-6" />
        </button>
      )}
    </div>
  );
}

/** The exact alert copy used across the Home section in Figma. */
export const HOME_ALERTS = {
  updated: { tone: "info" as const, title: "Post updated" },
  rooted: {
    tone: "info" as const,
    title: "Post rooted. Your Circle will see this post.",
  },
  grouved: {
    tone: "info" as const,
    title: "Post Grouved. Your Circle will see this post.",
  },
  deleted: { tone: "danger" as const, title: "Post deleted" },
  reported: { tone: "info" as const, title: "Report submitted" },
  confirmDelete: {
    tone: "confirm" as const,
    title: "Are you sure you want to delete this post?",
    description:
      "This action can’t be undone. Your post and its comments will be permanently removed.",
  },
};

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 11v5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="12" cy="8" r="1" fill="currentColor" />
    </svg>
  );
}

function ErrorIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 7.5v5.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="12" cy="16.5" r="1" fill="currentColor" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="m6 6 12 12M18 6 6 18"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
