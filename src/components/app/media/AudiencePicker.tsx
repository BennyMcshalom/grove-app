"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/app/Avatar";
import { Button } from "@/components/ui/Button";
import { PersonRowsSkeleton } from "@/components/ui/Skeleton";
import { listAudienceBonds } from "@/lib/post-actions";
import { cn } from "@/lib/cn";

export interface AudienceBond {
  userId: string;
  name: string;
  avatarUrl: string | null;
  phase: string | null;
}

/**
 * How a post is shared — one choice of four. Anonymously and Open Grouv are
 * both the whole circle ("everyone") with one more thing on: no name, or
 * reaching people at the same stage beyond the circle. "Only me" isn't
 * offered (posts saved that way still work).
 */
export type ShareChoice = "selected_bonds" | "everyone" | "anonymous" | "open";

export const SHARE_OPTIONS: { value: ShareChoice; label: string; hint: string }[] = [
  { value: "selected_bonds", label: "Selected Bonds", hint: "Choose specific Bonds to share with" },
  { value: "everyone", label: "Everyone", hint: "Your whole Grouv circle" },
  { value: "anonymous", label: "Anonymously", hint: "Your circle sees it without your name or photo" },
  { value: "open", label: "Open Grouv", hint: "Reach people at your stage beyond your circle" },
];

/**
 * "Who can see this ▾" — Figma 1310:23137 (the menu) and 1310:23173 (SELECT
 * BOND, a checkbox per bond). With bonds chosen, "This post will be visible
 * to:" lists exactly who (h07) — the exact audience preview PRD §6 asks for
 * before publishing.
 */
export function AudiencePicker({
  choice,
  selected,
  onChange,
}: {
  choice: ShareChoice;
  /** User ids, for "selected_bonds". */
  selected: string[];
  onChange: (choice: ShareChoice, selected: string[]) => void;
}) {
  const [open, setOpen] = useState<"menu" | "bonds" | null>(null);
  const [bonds, setBonds] = useState<AudienceBond[] | null>(null);
  const [picking, setPicking] = useState<string[]>(selected);
  const box = useRef<HTMLDivElement>(null);

  // Bonds load once, the first time they're needed (a restored draft needs
  // them for its preview too).
  const needBonds = open !== null || (choice === "selected_bonds" && selected.length > 0);
  useEffect(() => {
    if (!needBonds || bonds) return;
    let live = true;
    void listAudienceBonds()
      .then((list) => live && setBonds(list))
      .catch(() => live && setBonds([]));
    return () => {
      live = false;
    };
  }, [needBonds, bonds]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(null);
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  const chosen = (bonds ?? []).filter((b) => selected.includes(b.userId));

  const current = SHARE_OPTIONS.find((o) => o.value === choice) ?? SHARE_OPTIONS[1];

  return (
    <div ref={box} className="relative flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="font-sans text-sm font-medium text-ink-700">Who can see this</span>
          <span className="font-sans text-xs text-ink-300">
            {choice === "selected_bonds" && chosen.length > 0
              ? `${chosen.length} ${chosen.length === 1 ? "Bond" : "Bonds"} you chose`
              : current.hint}
          </span>
        </span>
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={open !== null}
          onClick={() => {
            setPicking(selected);
            setOpen(open ? null : "menu");
          }}
          className="flex shrink-0 items-center gap-2 rounded-full bg-primary-50 px-3 py-1.5 font-sans text-sm font-medium text-ink-700 transition-colors hover:bg-primary-100"
        >
          {current.label}
          <svg viewBox="0 0 16 16" fill="none" className="size-4" aria-hidden="true">
            <path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {open === "menu" && (
        <ul
          role="menu"
          aria-label="Who can see this"
          className="absolute right-0 bottom-full z-20 mb-2 w-[min(320px,calc(100vw-4rem))] rounded-2xl bg-surface p-4 shadow-[0px_0px_36px_0px_rgba(0,0,0,0.15)]"
        >
          {SHARE_OPTIONS.map((option, i) => {
            const bondsRow = option.value === "selected_bonds";
            return (
              <li key={option.value} className={cn(i > 0 && "border-t border-ink-50")}>
                <button
                  type="button"
                  role={bondsRow ? "menuitem" : "menuitemradio"}
                  aria-checked={bondsRow ? undefined : choice === option.value}
                  onClick={() => {
                    if (bondsRow) {
                      setOpen("bonds");
                      return;
                    }
                    onChange(option.value, []);
                    setOpen(null);
                  }}
                  className="flex w-full items-center justify-between gap-4 py-3 text-left"
                >
                  <span className="flex flex-col gap-0.5">
                    <span className="font-sans text-base font-semibold text-ink-800">{option.label}</span>
                    <span className="font-sans text-sm text-ink-400">{option.hint}</span>
                  </span>
                  {bondsRow ? (
                    <svg viewBox="0 0 16 16" fill="none" className="size-4 text-ink-300" aria-hidden="true">
                      <path d="m6 4 4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <span
                      aria-hidden="true"
                      className={cn(
                        "grid size-4 place-items-center rounded-md border",
                        choice === option.value ? "border-primary-500 bg-primary-500" : "border-ink-100",
                      )}
                    >
                      {choice === option.value && <span className="size-1.5 rounded-full bg-white" />}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {open === "bonds" && (
        <div
          role="dialog"
          aria-label="Select bond"
          className="absolute right-0 bottom-full z-20 mb-2 flex max-h-[420px] w-[min(360px,calc(100vw-4rem))] flex-col gap-3 rounded-2xl bg-surface p-4 shadow-[0px_0px_36px_0px_rgba(0,0,0,0.15)]"
        >
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setOpen("menu")}
              className="font-sans text-sm text-ink-400 hover:text-ink-600"
              aria-label="Back to audience options"
            >
              ‹ Back
            </button>
            <h3 className="font-sans text-base font-medium tracking-wide text-ink-700 uppercase">Select bond</h3>
            <span className="w-10" />
          </div>
          {bonds === null ? (
            <PersonRowsSkeleton count={3} label="Loading your bonds" />
          ) : bonds.length === 0 ? (
            <p className="py-4 text-center font-sans text-sm text-ink-300">
              You don’t have any Bonds yet. Share with Everyone instead.
            </p>
          ) : (
            <ul className="flex min-h-0 flex-col scroll-slim overflow-y-auto">
              {bonds.map((bond) => {
                const on = picking.includes(bond.userId);
                return (
                  <li key={bond.userId} className="border-b border-ink-50 last:border-0">
                    <label className="flex cursor-pointer items-center gap-3 py-3">
                      <Avatar src={bond.avatarUrl} name={bond.name} sizes="40px" className="size-10" />
                      <span className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className="truncate font-sans text-sm font-medium text-ink-700">{bond.name}</span>
                        {bond.phase && (
                          <span className="w-fit rounded-full bg-ivory-200 px-2 py-0.5 font-sans text-xs text-ink-400">
                            {bond.phase}
                          </span>
                        )}
                      </span>
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() =>
                          setPicking(on ? picking.filter((id) => id !== bond.userId) : [...picking, bond.userId])
                        }
                        className="size-4 shrink-0 cursor-pointer accent-primary-500"
                      />
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
          {bonds && bonds.length > 0 && (
            <Button
              size="sm"
              fullWidth
              disabled={picking.length === 0}
              onClick={() => {
                onChange("selected_bonds", picking);
                setOpen(null);
              }}
            >
              {picking.length === 0 ? "Choose at least one" : `Share with ${picking.length}`}
            </Button>
          )}
        </div>
      )}

      {choice === "selected_bonds" && chosen.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="font-sans text-xs text-ink-300">This post will be visible to:</span>
          <ul className="flex flex-wrap gap-3">
            {chosen.map((b) => (
              <li key={b.userId} className="flex w-14 flex-col items-center gap-1">
                <Avatar src={b.avatarUrl} name={b.name} sizes="32px" className="size-8" />
                <span className="w-full truncate text-center font-sans text-xs text-ink-600">{b.name}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
