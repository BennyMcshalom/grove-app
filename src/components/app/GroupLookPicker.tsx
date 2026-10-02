"use client";

import { useEffect, useState, useTransition } from "react";
import { GroupArt } from "@/components/app/GroupArt";
import { useToast } from "@/components/app/ToastProvider";
import { FormError } from "@/components/auth/FormError";
import { Button } from "@/components/ui/Button";
import { Modal, ModalHeader } from "@/components/ui/Modal";
import { loadTakenGroupColors, updateGroupLook } from "@/app/(app)/groups/actions";
import { cn } from "@/lib/cn";
import {
  colorHue,
  GROUP_ARTS,
  GROUP_PALETTE,
  hueColor,
  inkOn,
  pickGroupColor,
  type GroupArtKey,
} from "@/lib/group-look";
import type { Group } from "@/lib/groups";

/** The hue slider's track: the custom colours it can land on, left to right. */
const HUE_TRACK = `linear-gradient(to right, ${[0, 45, 90, 135, 180, 225, 270, 315, 359].map(hueColor).join(", ")})`;

/**
 * Pick a group's look: line-art from the set and one flat colour. The
 * palette greys out colours other groups already wear; Shuffle
 * draws a free one, and the hue slider makes a custom one.
 */
export function GroupLookPicker({
  art,
  color,
  onChange,
  taken = [],
  title,
}: {
  art: GroupArtKey;
  color: string;
  onChange: (look: { art: GroupArtKey; color: string }) => void;
  /** Colours other groups in the same Space use. */
  taken?: string[];
  /** Shown on the preview card. */
  title?: string;
}) {
  const takenSet = new Set(taken.map((c) => c.toUpperCase()));
  const { ink } = inkOn(color);

  return (
    <div className="flex flex-col gap-6">
      {/* What the card will look like in the rail and on Groups. */}
      <div
        className="flex items-end justify-between gap-3 rounded-xl p-4"
        style={{ backgroundColor: color, color: ink }}
        aria-hidden="true"
      >
        <span className="line-clamp-2 min-w-0 font-display text-lg leading-tight font-bold">
          {title?.trim() || "Your group"}
        </span>
        <GroupArt art={art} {...inkOn(color)} className="size-16" />
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 font-sans text-base text-ink-300">PICK ART</legend>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
          {GROUP_ARTS.map((a) => (
            <button
              key={a.key}
              type="button"
              title={a.label}
              aria-label={a.label}
              aria-pressed={art === a.key}
              onClick={() => onChange({ art: a.key, color })}
              className={cn(
                "grid aspect-square place-items-center rounded-lg bg-ivory-100 p-1.5 transition-colors hover:bg-ivory-200",
                art === a.key && "bg-primary-50 ring-2 ring-primary-500",
              )}
            >
              <GroupArt art={a.key} ink="var(--color-ink-700)" paper="var(--color-surface)" className="size-full" />
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 flex w-full items-center justify-between gap-3 font-sans text-base text-ink-300">
          PICK A COLOUR
        </legend>
        <div className="flex flex-wrap gap-2.5">
          {GROUP_PALETTE.map((swatch) => {
            const inUse = takenSet.has(swatch) && swatch !== color.toUpperCase();
            return (
              <button
                key={swatch}
                type="button"
                disabled={inUse}
                aria-label={inUse ? `Colour ${swatch}, already used by another group` : `Colour ${swatch}`}
                title={inUse ? "Another group already has it" : undefined}
                aria-pressed={color.toUpperCase() === swatch}
                onClick={() => onChange({ art, color: swatch })}
                style={{ backgroundColor: swatch }}
                className={cn(
                  "relative size-9 rounded-full transition-shadow disabled:cursor-not-allowed disabled:opacity-30",
                  color.toUpperCase() === swatch && "ring-2 ring-primary-500 ring-offset-2 ring-offset-surface",
                )}
              />
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => onChange({ art, color: pickGroupColor(taken, color) })}
          >
            Shuffle
          </Button>
          <label className="flex min-w-[180px] flex-1 items-center gap-3">
            <span className="shrink-0 font-sans text-sm text-ink-400">Custom</span>
            <input
              type="range"
              min={0}
              max={359}
              value={colorHue(color)}
              onChange={(e) => onChange({ art, color: hueColor(Number(e.target.value)) })}
              aria-label="Custom colour hue"
              className="h-3 w-full cursor-pointer appearance-none rounded-full accent-ink-700"
              style={{ backgroundImage: HUE_TRACK }}
            />
          </label>
        </div>
      </fieldset>
    </div>
  );
}

/** Admins: change a group's art and colour after it's started. */
export function GroupLookModal({ group, onClose }: { group: Group; onClose: () => void }) {
  const toast = useToast();
  const [look, setLook] = useState({ art: group.art, color: group.color });
  const [taken, setTaken] = useState<string[]>([]);
  const [error, setError] = useState<string>();
  const [saving, startSaving] = useTransition();

  useEffect(() => {
    let cancelled = false;
    loadTakenGroupColors().then((colors) => {
      if (!cancelled) setTaken(colors);
    });
    return () => {
      cancelled = true;
    };
  }, [group.chapterSlug]);

  return (
    <Modal label="Group look" onClose={onClose}>
      <ModalHeader title="Group look" onClose={onClose} />
      <GroupLookPicker
        art={look.art}
        color={look.color}
        onChange={setLook}
        taken={taken.filter((c) => c.toUpperCase() !== group.color.toUpperCase())}
        title={group.title}
      />
      <div className="flex flex-col gap-3 border-t border-ink-50 pt-6">
        <FormError message={error} />
        <Button
          type="button"
          size="sm"
          fullWidth
          loading={saving}
          onClick={() =>
            startSaving(async () => {
              const result = await updateGroupLook(group.id, look);
              if (result.error) {
                setError(result.error);
                return;
              }
              toast({ title: "Group look updated" });
              onClose();
            })
          }
        >
          Save
        </Button>
      </div>
    </Modal>
  );
}
