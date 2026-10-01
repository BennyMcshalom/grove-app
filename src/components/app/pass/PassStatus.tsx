"use client";

import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/cn";

/**
 * The centred Season Pass status dialogs — Figma 1548:777 (trial confirm),
 * 1548:798 (pending), 1548:804 (success), 1548:823 (failure), 1548:843 (trial
 * ineligible) and 1550:22879 (cancel confirmation): a round tinted badge, a
 * title, one paragraph, then the actions stacked full width.
 */
type Tone = "primary" | "neutral" | "success" | "danger" | "warning";

const BADGE: Record<Tone, string> = {
  primary: "bg-primary-100 text-primary-600",
  neutral: "bg-ivory-200 text-ink-500",
  success: "bg-success-10 text-success-70",
  danger: "bg-destructive-10 text-destructive-60",
  warning: "bg-warning-10 text-warning-70",
};

export function StatusCard({
  icon,
  tone = "primary",
  title,
  children,
  actions,
  footnote,
}: {
  icon: React.ReactNode;
  tone?: Tone;
  title: React.ReactNode;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  footnote?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <div className="flex flex-col items-center gap-3">
        <span className={cn("grid size-14 place-items-center rounded-full", BADGE[tone])} aria-hidden="true">
          {icon}
        </span>
        <h2 className="font-display text-xl font-semibold text-ink-800 lg:text-2xl">{title}</h2>
        {children && <div className="max-w-[420px] font-sans text-base text-ink-300">{children}</div>}
      </div>
      {actions && <div className="flex w-full flex-col items-stretch gap-2">{actions}</div>}
      {footnote && <p className="font-sans text-xs text-ink-300">{footnote}</p>}
    </div>
  );
}

/** A status card on its own in the 480px dialog. */
export function StatusModal({
  label,
  onClose,
  ...card
}: { label: string; onClose: () => void } & React.ComponentProps<typeof StatusCard>) {
  return (
    <Modal label={label} onClose={onClose} width="max-w-[480px]">
      <StatusCard {...card} />
    </Modal>
  );
}

/** The quiet text button under a primary action ("Not now", "Continue with Free"). */
export function TextAction({
  tone = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "primary" | "danger" | "muted" }) {
  return (
    <button
      type="button"
      className={cn(
        "rounded-pill px-4 py-2.5 font-ui text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        tone === "primary" && "text-primary-800 hover:bg-primary-50",
        tone === "danger" && "text-destructive-60 hover:bg-destructive-5",
        tone === "muted" && "text-ink-400 hover:bg-ivory-200",
        className,
      )}
      {...props}
    />
  );
}

/** "September 30, 2027". UTC, so the server and browser render the same day. */
export function longDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}

/** "Sep 30, 2027" */
export function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

export function ClockIcon({ className = "size-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 3a9 9 0 1 0 9 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 7.5V12l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16.5 4.2h.01M19.2 6.6h.01M20.6 9.6h.01" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export function CheckCircleIcon({ className = "size-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="m8.5 12.2 2.3 2.3 4.7-4.9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function AlertCircleIcon({ className = "size-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 7.5v5.5M12 16.4h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function WarningIcon({ className = "size-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M10.3 4.2 2.9 17.5A2 2 0 0 0 4.6 20.5h14.8a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M12 9.5v4M12 16.8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function GiftIcon({ className = "size-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="3.5" y="8" width="17" height="4" rx="1" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7M12 8v12" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 8S10.5 4 8.2 4.3C6.4 4.6 6.6 7.5 8.6 8M12 8s1.5-4 3.8-3.7c1.8.3 1.6 3.2-.4 3.7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** The small orange tick the plan lists use. */
export function Tick({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={cn("size-4 shrink-0 text-primary-500", className)} aria-hidden="true">
      <path d="m3 8.5 3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
