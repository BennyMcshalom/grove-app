"use client";

import { cn } from "@/lib/cn";

/**
 * PICK AN ICON — the 57px glyph grid Figma reuses in Create an Event
 * (575:16941) and Start a group (211:11751).
 *
 * The fifteen Phosphor glyphs are exported from the file; they ship without a
 * fill, so each is masked to take its button's own colour.
 */
export const PICKER_ICONS = [
  "fire",
  "plant",
  "suitcase",
  "planet",
  "target",
  "cursor-click",
  "palette",
  "yin-yang",
  "hand-peace",
  "flower-lotus",
  "atom",
  "sparkle",
  "baby",
  "barricade",
  "hourglass",
];

export function IconPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (name: string) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-6">
      <legend className="font-sans text-base text-ink-300">PICK AN ICON</legend>
      <div className="flex flex-wrap gap-5">
        {PICKER_ICONS.map((name) => (
          <button
            key={name}
            type="button"
            aria-label={name.replace("-", " ")}
            aria-pressed={value === name}
            onClick={() => onChange(name)}
            className={cn(
              "grid size-14 place-items-center rounded-lg transition-colors",
              value === name
                ? "bg-primary-500 text-white"
                : "bg-primary-50 text-primary-600 hover:bg-primary-100",
            )}
          >
            <span
              className="size-8 bg-current"
              style={{
                maskImage: `url(/icons/events/${name}.svg)`,
                WebkitMaskImage: `url(/icons/events/${name}.svg)`,
                maskSize: "contain",
                WebkitMaskSize: "contain",
                maskRepeat: "no-repeat",
                WebkitMaskRepeat: "no-repeat",
                maskPosition: "center",
                WebkitMaskPosition: "center",
              }}
            />
          </button>
        ))}
      </div>
    </fieldset>
  );
}
