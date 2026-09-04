"use client";

import { cn } from "@/lib/cn";
import { useRef } from "react";

/**
 * PIN slots — Figma component set 127:14428, laid out by frame 127:21393.
 * Four 80x80 slots, 12px gap, white fill, #E5E7EB border.
 */
export function PinInput({
  length = 4,
  value,
  onChange,
  label = "One-time code",
}: {
  length?: number;
  value: string;
  onChange: (next: string) => void;
  label?: string;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  const setDigit = (index: number, digit: string) => {
    const next = value.padEnd(length, " ").split("");
    next[index] = digit || " ";
    onChange(next.join("").replace(/\s+$/, ""));
  };

  const handleChange = (index: number, raw: string) => {
    const digits = raw.replace(/\D/g, "");
    if (!digits) {
      setDigit(index, "");
      return;
    }

    // Typing or pasting several digits fills forward from this slot.
    if (digits.length > 1) {
      const merged = (value.slice(0, index) + digits).slice(0, length);
      onChange(merged);
      refs.current[Math.min(merged.length, length - 1)]?.focus();
      return;
    }

    setDigit(index, digits);
    if (index < length - 1) refs.current[index + 1]?.focus();
  };

  const handleKeyDown = (
    index: number,
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === "Backspace" && !value[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      refs.current[index - 1]?.focus();
    }
    if (event.key === "ArrowRight" && index < length - 1) {
      event.preventDefault();
      refs.current[index + 1]?.focus();
    }
  };

  return (
    <div
      role="group"
      aria-label={label}
      className="flex items-center gap-3"
    >
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          ref={(el) => {
            refs.current[index] = el;
          }}
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={length}
          aria-label={`Digit ${index + 1} of ${length}`}
          value={value[index] ?? ""}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          className={cn(
            "size-12 rounded-xl border border-[#E5E7EB] bg-white text-center sm:size-14 lg:size-16 xl:size-20",
            "font-display text-xl font-semibold text-ink-700 sm:text-2xl xl:text-3xl",
            "transition-[border-color,box-shadow] duration-150",
            "focus:border-primary-200 focus:shadow-[0px_0px_0px_4px_rgba(249,189,152,0.25)] focus:outline-none",
          )}
        />
      ))}
    </div>
  );
}
