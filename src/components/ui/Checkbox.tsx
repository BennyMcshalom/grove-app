"use client";

import { cn } from "@/lib/cn";
import { useId } from "react";
import type { InputHTMLAttributes } from "react";

/**
 * Checkbox + Text — Figma component set 15:17740.
 * 16x16 box, 6px radius, Gray/30 (#CBD5E1) border, white fill.
 */
export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  label: React.ReactNode;
  /** Renders as a passive checklist marker (password rules), not an input. */
  readOnlyMarker?: boolean;
}

export function Checkbox({
  label,
  readOnlyMarker = false,
  className,
  id,
  checked,
  ...props
}: CheckboxProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  if (readOnlyMarker) {
    return (
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "flex size-4 shrink-0 items-center justify-center rounded-md border",
            checked
              ? "border-success-60 bg-success-60 text-white"
              : "border-[#CBD5E1] bg-white",
          )}
          aria-hidden="true"
        >
          {checked && <CheckIcon />}
        </span>
        <span
          className={cn(
            "font-sans text-sm",
            checked ? "text-success-70" : "text-ink-500",
          )}
        >
          {label}
        </span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <input
        id={inputId}
        type="checkbox"
        checked={checked}
        className={cn(
          "size-4 shrink-0 appearance-none rounded-md border border-[#CBD5E1] bg-white",
          "checked:border-primary-500 checked:bg-primary-500",
          "relative cursor-pointer",
          "checked:after:absolute checked:after:inset-0 checked:after:flex",
          "checked:after:items-center checked:after:justify-center",
          "checked:after:text-[11px] checked:after:leading-none checked:after:text-white",
          "checked:after:content-['✓']",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600",
        )}
        {...props}
      />
      <label
        htmlFor={inputId}
        className="cursor-pointer font-sans text-base text-ink-800"
      >
        {label}
      </label>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 12 12" fill="none" className="size-3">
      <path
        d="M2.5 6.2 4.8 8.5 9.5 3.8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
