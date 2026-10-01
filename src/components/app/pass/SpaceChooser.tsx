"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { useToast } from "@/components/app/ToastProvider";
import { useViewer } from "@/components/app/ViewerProvider";
import { TextAction } from "@/components/app/pass/PassStatus";
import { FormError } from "@/components/auth/FormError";
import { Button } from "@/components/ui/Button";
import { Modal, ModalHeader } from "@/components/ui/Modal";
import { FREE_ACTIVE_SPACES, getChapter } from "@/lib/chapters";
import { cn } from "@/lib/cn";
import { chooseActiveSpaces } from "@/lib/pass-actions";

/**
 * "Choose which 4 Spaces stay active" (PRD §13; no Figma frame). Shown after
 * a downgrade paused Spaces, and from a paused Space's "Reactivate" when
 * Free's four are taken. Cards follow SpaceCard's content: glyph, name, stage.
 */
export function SpaceChooser({
  focusId,
  onClose,
  onUpgrade,
}: {
  /** A paused Space they asked to reactivate: starts selected. */
  focusId?: string;
  onClose: () => void;
  onUpgrade: () => void;
}) {
  const { chapters } = useViewer();
  const toast = useToast();
  const [error, setError] = useState<string>();
  const [saving, startSaving] = useTransition();
  const [chosen, setChosen] = useState<string[]>(() => {
    const active = chapters.filter((c) => !c.pausedAt).map((c) => c.id);
    if (!focusId || active.includes(focusId)) return active.slice(0, FREE_ACTIVE_SPACES);
    // Room for the one they want back: drop the last of the current four.
    return [focusId, ...active].slice(0, FREE_ACTIVE_SPACES);
  });

  const toggle = (id: string) =>
    setChosen((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= FREE_ACTIVE_SPACES ? prev : [...prev, id],
    );

  const save = () =>
    startSaving(async () => {
      setError(undefined);
      const result = await chooseActiveSpaces(chosen);
      if (result.error) {
        setError(result.error);
        return;
      }
      toast({ title: "Your active Spaces are saved", tone: "confirm" });
      onClose();
    });

  return (
    <Modal label="Choose your active Spaces" onClose={onClose} width="max-w-[560px]">
      <ModalHeader title={`Choose which ${FREE_ACTIVE_SPACES} Spaces stay active`} onClose={onClose} />
      <p className="-mt-3 font-sans text-sm text-ink-400">
        Free keeps {FREE_ACTIVE_SPACES} Spaces active. The others pause — their posts, logs and archive stay
        right where they are, and you can switch any time. Until you choose, we&rsquo;ve kept the ones you used
        most recently.
      </p>

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {chapters.map((held) => {
          const chapter = getChapter(held.slug);
          if (!chapter) return null;
          const on = chosen.includes(held.id);
          const full = !on && chosen.length >= FREE_ACTIVE_SPACES;
          return (
            <li key={held.id}>
              <button
                type="button"
                role="checkbox"
                aria-checked={on}
                disabled={full}
                onClick={() => toggle(held.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg bg-surface p-3 text-left shadow-[0px_1px_2px_0px_rgba(23,23,23,0.05)] transition-colors",
                  on ? "ring-2 ring-primary-500" : "ring-1 ring-ivory-600",
                  full ? "cursor-not-allowed opacity-50" : "hover:bg-ivory-100",
                )}
              >
                <Image src={chapter.icon} alt="" width={56} height={56} className="size-9 shrink-0" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-sans text-base font-semibold text-ink-800">{chapter.name}</span>
                  <span className="truncate font-sans text-xs text-ink-400">
                    {on ? held.phase : "Will pause"}
                  </span>
                </span>
                <span
                  className={cn(
                    "grid size-5 shrink-0 place-items-center rounded-md border",
                    on ? "border-primary-500 bg-primary-500 text-white" : "border-ink-100 bg-surface",
                  )}
                  aria-hidden="true"
                >
                  {on && (
                    <svg viewBox="0 0 16 16" fill="none" className="size-3.5">
                      <path d="m3.5 8.5 3 3 6-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <FormError message={error} />

      <div className="flex flex-col items-stretch gap-2">
        <Button size="md" fullWidth loading={saving} disabled={chosen.length === 0} onClick={save}>
          Keep these {chosen.length} active
        </Button>
        <Button variant="secondary" size="md" fullWidth onClick={onUpgrade}>
          Keep all eight with Season Pass
        </Button>
        <TextAction tone="muted" onClick={onClose}>
          Decide later
        </TextAction>
      </div>
    </Modal>
  );
}
