"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Avatar } from "@/components/app/Avatar";
import { cn } from "@/lib/cn";
import { findMentionable } from "@/lib/mention-actions";
import { activeMentionQuery, mentionIdsIn, type MentionContext, type MentionPerson } from "@/lib/mentions";

/** The people picked from the @ list while writing one draft. */
export interface MentionPicks {
  add: (person: MentionPerson) => void;
  /** Ids of the picked people whose "@Name" is still in `text`. */
  idsIn: (text: string) => string[];
  /** The picked people still in `text`, for showing them straight away. */
  peopleIn: (text: string) => MentionPerson[];
  clear: () => void;
}

export function useMentionPicks(): MentionPicks {
  const picked = useRef(new Map<string, MentionPerson>());
  return useMemo(
    () => ({
      add: (person) => void picked.current.set(person.id, person),
      idsIn: (text) => mentionIdsIn(text, picked.current.values()),
      peopleIn: (text) => {
        const ids = new Set(mentionIdsIn(text, picked.current.values()));
        return [...picked.current.values()].filter((p) => ids.has(p.id));
      },
      clear: () => picked.current.clear(),
    }),
    [],
  );
}

type Field = HTMLTextAreaElement | HTMLInputElement;

/**
 * A text box that offers people when you type "@": pick one (tap, or arrows
 * and Enter/Tab) and "@Name " goes in at the caret. Everything else behaves
 * like the plain textarea/input it replaces; Enter only picks while the list
 * is open.
 */
export function MentionInput({
  as = "textarea",
  value,
  onChange,
  context,
  picks,
  placement = "below",
  wrapperClassName,
  onKeyDown,
  ...field
}: {
  as?: "textarea" | "input";
  value: string;
  onChange: (value: string) => void;
  context: MentionContext;
  picks: MentionPicks;
  /** Chat boxes sit at the bottom of the screen, so their list opens upward. */
  placement?: "above" | "below";
  wrapperClassName?: string;
  onKeyDown?: React.KeyboardEventHandler<Field>;
  id?: string;
  name?: string;
  rows?: number;
  maxLength?: number;
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}) {
  const ref = useRef<Field>(null);
  const [active, setActive] = useState<{ start: number; query: string } | null>(null);
  const [results, setResults] = useState<MentionPerson[]>([]);
  const [highlight, setHighlight] = useState(0);
  const caretAfter = useRef<number | null>(null);

  // Searching: a fixed list filters locally; anything else asks the server.
  const contextKey = context.kind === "people" ? "people" : JSON.stringify(context);
  const localPeople = context.kind === "people" ? context.people : null;
  useEffect(() => {
    if (!active) return;
    const q = active.query.toLocaleLowerCase();
    if (localPeople) {
      const found = localPeople.filter((p) => p.name.toLocaleLowerCase().startsWith(q)).slice(0, 8);
      const timer = setTimeout(() => setResults(found), 0);
      return () => clearTimeout(timer);
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      findMentionable(JSON.parse(contextKey) as MentionContext, active.query)
        .then((found) => {
          if (!cancelled) setResults(found);
        })
        .catch(() => undefined);
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [active, contextKey, localPeople]);

  // Put the caret after an inserted name once React has written the value.
  useEffect(() => {
    const at = caretAfter.current;
    if (at === null || !ref.current) return;
    caretAfter.current = null;
    ref.current.focus();
    ref.current.setSelectionRange(at, at);
  }, [value]);

  const track = (el: Field) => {
    const next = activeMentionQuery(el.value, el.selectionStart ?? el.value.length);
    setActive((prev) => (prev?.start === next?.start && prev?.query === next?.query ? prev : next));
    if (!next) setResults([]);
    setHighlight(0);
  };

  const open = active !== null && results.length > 0;

  const pick = (person: MentionPerson) => {
    if (!active) return;
    const el = ref.current;
    const caret = el?.selectionStart ?? value.length;
    const inserted = `@${person.name} `;
    const next = value.slice(0, active.start) + inserted + value.slice(caret).replace(/^ /, "");
    picks.add(person);
    caretAfter.current = active.start + inserted.length;
    setActive(null);
    setResults([]);
    onChange(next);
  };

  const keyDown = (e: React.KeyboardEvent<Field>) => {
    if (open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const step = e.key === "ArrowDown" ? 1 : -1;
        setHighlight((h) => (h + step + results.length) % results.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        pick(results[Math.min(highlight, results.length - 1)]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setActive(null);
        setResults([]);
        return;
      }
    }
    onKeyDown?.(e);
  };

  const shared = {
    ...field,
    value,
    role: "combobox" as const,
    "aria-expanded": open,
    "aria-autocomplete": "list" as const,
    onChange: (e: React.ChangeEvent<Field>) => {
      onChange(e.target.value);
      track(e.target);
    },
    onSelect: (e: React.SyntheticEvent<Field>) => track(e.currentTarget),
    onKeyDown: keyDown,
    onBlur: () => {
      // Late enough for a tap on the list to land first.
      setTimeout(() => {
        setActive(null);
        setResults([]);
      }, 150);
    },
  };

  return (
    <div className={cn("relative", wrapperClassName)}>
      {as === "textarea" ? (
        <textarea ref={ref as React.RefObject<HTMLTextAreaElement>} {...shared} />
      ) : (
        <input ref={ref as React.RefObject<HTMLInputElement>} {...shared} />
      )}
      {open && (
        <ul
          role="listbox"
          aria-label="People you can mention"
          className={cn(
            "absolute left-0 z-30 flex max-h-64 w-full max-w-[320px] flex-col gap-0.5 scroll-slim overflow-y-auto rounded-xl border border-ink-50 bg-surface p-1.5 shadow-lg",
            placement === "above" ? "bottom-full mb-2" : "top-full mt-2",
          )}
        >
          {results.map((person, i) => (
            <li key={person.id} role="option" aria-selected={i === highlight}>
              <button
                type="button"
                // Keep focus in the box so the caret position survives.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(person)}
                onMouseEnter={() => setHighlight(i)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left font-sans text-sm font-medium text-ink-700 transition-colors",
                  i === highlight ? "bg-ivory-200" : "hover:bg-ivory-100",
                )}
              >
                <Avatar src={person.avatarUrl} name={person.name} aura={person.aura} sizes="28px" className="size-7" />
                {person.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
