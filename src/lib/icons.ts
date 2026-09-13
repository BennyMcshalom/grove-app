/**
 * PICK AN ICON glyphs (public/icons/events/<name>.svg), shared by groups and
 * events. Matches the picker_icon domain in supabase/migrations.
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
] as const;

export type PickerIcon = (typeof PICKER_ICONS)[number];
