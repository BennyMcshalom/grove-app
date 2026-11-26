"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
  disabled?: boolean;
}

/**
 * Grouv's dropdown, in place of the browser's own <select>: a button showing
 * the choice and a caret, and a rounded list with the brand highlight and a
 * check on the current one. Keyboard: ↑ ↓ to move, Enter/Space to choose,
 * Esc to close, typing a letter jumps to the first option starting with it.
 */
export function Select<T extends string>({
  value,
  onChange,
  options,
  placeholder = "Choose…",
  id,
  ariaLabel,
  className,
  align = "left",
  disabled = false,
  fullWidth = false,
}: {
  value: T;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  /** Shown when nothing (or a disabled "pick one" option) is chosen. */
  placeholder?: string;
  id?: string;
  ariaLabel?: string;
  /** The button's look: the field it sits in decides (field, pill, inline). */
  className?: string;
  /** Which edge the list lines up with. */
  align?: "left" | "right";
  disabled?: boolean;
  /** Fills its field (forms) instead of sizing to the choice. */
  fullWidth?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  // Opens upward when there isn't room below (the bottom of a modal).
  const [upward, setUpward] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const listId = useId();
  const current = options.find((o) => o.value === value);
  const shown = current && !current.disabled ? current.label : placeholder;

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [open]);

  useEffect(() => {
    if (open) list.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const openList = () => {
    const box = root.current?.getBoundingClientRect();
    if (box) setUpward(window.innerHeight - box.bottom < 240 && box.top > window.innerHeight - box.bottom);
    const at = options.findIndex((o) => o.value === value);
    setActive(at >= 0 ? at : options.findIndex((o) => !o.disabled));
    setOpen(true);
  };

  const choose = (index: number) => {
    const option = options[index];
    if (!option || option.disabled) return;
    onChange(option.value);
    setOpen(false);
  };

  const step = (from: number, by: 1 | -1) => {
    for (let i = from + by, n = 0; n < options.length; i += by, n++) {
      const index = (i + options.length) % options.length;
      if (!options[index].disabled) return index;
    }
    return from;
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        openList();
      }
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => step(a, e.key === "ArrowDown" ? 1 : -1));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      choose(active);
    } else if (e.key === "Escape" || e.key === "Tab") {
      if (e.key === "Escape") e.preventDefault();
      setOpen(false);
    } else if (e.key.length === 1) {
      const index = options.findIndex((o) => !o.disabled && o.label.toLowerCase().startsWith(e.key.toLowerCase()));
      if (index >= 0) setActive(index);
    }
  };

  return (
    <div ref={root} className={cn("relative min-w-0", fullWidth ? "flex w-full" : "inline-flex")}>
      <button
        type="button"
        id={id}
        role="combobox"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        className={cn(
          "flex min-w-0 flex-1 items-center justify-between gap-2 text-left outline-none focus-visible:shadow-[0px_0px_0px_4px_rgba(249,189,152,0.35)] disabled:opacity-50",
          className,
        )}
      >
        <span className={cn("truncate", !(current && !current.disabled) && "text-ink-300")}>{shown}</span>
        <svg
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
          className={cn("size-4 shrink-0 text-primary-500 transition-transform", open && "rotate-180")}
        >
          <path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <ul
          ref={list}
          id={listId}
          role="listbox"
          aria-activedescendant={`${listId}-${active}`}
          className={cn(
            "absolute z-50 max-h-56 min-w-full scroll-slim overflow-y-auto overscroll-contain rounded-xl border border-ink-50 bg-surface p-1 shadow-[0px_8px_24px_0px_rgba(0,0,0,0.12)]",
            align === "right" ? "right-0" : "left-0",
            upward ? "bottom-full mb-1.5" : "top-full mt-1.5",
          )}
        >
          {options.map((option, index) =>
            option.disabled ? null : (
              <li
                key={option.value}
                id={`${listId}-${index}`}
                data-index={index}
                role="option"
                aria-selected={option.value === value}
                onMouseEnter={() => setActive(index)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(index)}
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-4 rounded-lg px-3 py-1.5 font-sans text-sm whitespace-nowrap",
                  index === active ? "bg-primary-50 text-primary-700" : "text-ink-600",
                  option.value === value && "font-semibold",
                )}
              >
                {option.label}
                {option.value === value && (
                  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="size-4 shrink-0 text-primary-500">
                    <path d="m4.5 10.5 3.5 3.5 7.5-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  );
}
