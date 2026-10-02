"use client";

import { cn } from "@/lib/cn";

/**
 * The one on/off switch — Figma "Toggle Only" 177:4264: 44x24 track, 2px
 * padding, 20px knob. The knob is laid out with flex (justify-start/end), not
 * an absolute offset, so it can never slide outside the track.
 */
export function Switch({
  label,
  checked,
  onChange,
  disabled = false,
  size = "md",
  className,
}: {
  /** Accessible name; the visible label lives next to the switch. */
  label: string;
  checked: boolean;
  onChange?: (next: boolean) => void;
  disabled?: boolean;
  size?: SwitchSize;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-label={label}
      aria-checked={checked}
      disabled={disabled}
      // A native button already toggles on Enter and Space.
      onClick={() => onChange?.(!checked)}
      className={cn(
        "shrink-0 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
    >
      <SwitchTrack on={checked} size={size} />
    </button>
  );
}

type SwitchSize = "md" | "sm";

/**
 * The switch's drawing alone, for rows where the whole row is the
 * role="switch" control (the Sidebar's Dark mode item).
 */
export function SwitchTrack({ on, size = "md" }: { on: boolean; size?: SwitchSize }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center rounded-full p-0.5 transition-colors",
        size === "md" ? "h-6 w-11" : "h-5 w-9",
        on ? "justify-end bg-primary-600" : "justify-start bg-ink-50",
      )}
    >
      <span className={cn("rounded-full bg-white shadow-sm", size === "md" ? "size-5" : "size-4")} />
    </span>
  );
}
