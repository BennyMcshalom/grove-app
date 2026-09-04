"use client";

import { cn } from "@/lib/cn";
import { useId } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";

/**
 * Input field — Figma component set 13:12717.
 *
 * Figma models Placeholder / Filled / Focused / Disabled as separate variants;
 * here they are the browser's own states. `destructive` mirrors the
 * Destructive=True axis.
 */
export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  hint?: string;
  error?: string;
  iconLeft?: ReactNode;
}

export function Input({
  label,
  hint,
  error,
  iconLeft,
  className,
  id,
  disabled,
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const describedById = `${inputId}-desc`;
  const message = error ?? hint;

  return (
    <div className="flex w-full flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="font-sans text-sm font-medium text-ink-500"
        >
          {label}
        </label>
      )}

      <div
        className={cn(
          // Figma: 10/14 padding, 8px radius, 1px border, Shadow/xs.
          "flex items-center gap-2 rounded-lg border px-3.5 py-2.5",
          "shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]",
          "transition-[color,box-shadow,border-color] duration-150",
          // Focus ring is drawn on the wrapper so it surrounds the icon too.
          "focus-within:border-primary-200 focus-within:shadow-[0px_0px_0px_4px_rgba(249,189,152,0.25)]",
          disabled ? "bg-ivory-200" : "bg-ivory-100",
          error
            ? "border-destructive-50 focus-within:border-destructive-50 focus-within:shadow-[0px_0px_0px_4px_rgba(244,63,94,0.25)]"
            : "border-ink-100",
          className,
        )}
      >
        {iconLeft && (
          <span className="shrink-0 text-ink-300" aria-hidden="true">
            {iconLeft}
          </span>
        )}
        <input
          id={inputId}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? describedById : undefined}
          className={cn(
            "w-full bg-transparent font-sans text-base text-ink-500 outline-none",
            "placeholder:text-ink-200",
            "disabled:cursor-not-allowed disabled:text-ink-200",
          )}
          {...props}
        />
      </div>

      {message && (
        <p
          id={describedById}
          className={cn(
            "font-sans text-sm",
            error ? "text-destructive-60" : "text-ink-400",
          )}
        >
          {message}
        </p>
      )}
    </div>
  );
}
