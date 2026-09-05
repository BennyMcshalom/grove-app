"use client";

import { useState } from "react";
import { IconPicker, PICKER_ICONS } from "@/components/app/IconPicker";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/app/ToastProvider";
import { cn } from "@/lib/cn";

/**
 * Start a group — Figma frame 211:11620.
 *
 * A 660px white card: title + close, the strapline, PICK AN ICON and PICK A
 * COLOR, then Chapter Name / Label / what it's for, and "Create group" above a
 * top rule. Labels, placeholders and swatches are Figma's.
 */
const COLORS = [
  "#FAF8CA",
  "#E9FEF8",
  "#CFF7FA",
  "#D6E1FC",
  "#BDE3EE",
  "#FED1FA",
  "#FED1DD",
  "#FEF1E9",
];

export function CreateGroupModal({ onClose }: { onClose: () => void }) {
  const [icon, setIcon] = useState(PICKER_ICONS[0]);
  const [color, setColor] = useState(COLORS[0]);
  const [created, setCreated] = useState(false);
  const toast = useToast();

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-900/40 p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Start a group"
        onClick={(e) => e.stopPropagation()}
        className="my-auto flex w-full max-w-[660px] flex-col gap-6 rounded-2xl bg-white p-6 sm:p-8"
      >
        <header className="flex items-center justify-between gap-4">
          <h2 className="font-display text-2xl font-semibold text-ink-800">
            Start a group
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded p-3 text-ink-800 transition-colors hover:bg-ivory-200"
          >
            <CloseIcon />
          </button>
        </header>

        {/* Figma's strapline (211:11679) is cut off mid-word in the file; kept
            verbatim rather than completed here. */}
        <p className="font-sans text-base text-ink-800">
          Open a room for a life-phase you don&rsquo;t h
        </p>

        {created ? (
          <p className="rounded-xl border border-primary-200 bg-primary-50 p-4 font-sans text-base text-ink-400">
            Your group is open. It will show under Chapter Groups.
          </p>
        ) : (
          <form
            className="flex flex-col gap-6"
            onSubmit={(e) => {
              e.preventDefault();
              setCreated(true);
              toast({ title: "New group started" });
            }}
          >
            <IconPicker value={icon} onChange={setIcon} />

            <fieldset className="flex flex-col gap-6">
              <legend className="font-sans text-base text-ink-300">
                PICK A COLOR
              </legend>
              <div className="flex flex-wrap gap-5">
                {COLORS.map((swatch) => (
                  <button
                    key={swatch}
                    type="button"
                    aria-label={`Colour ${swatch}`}
                    aria-pressed={color === swatch}
                    onClick={() => setColor(swatch)}
                    style={{ backgroundColor: swatch }}
                    className={cn(
                      "size-14 rounded-full transition-shadow",
                      color === swatch &&
                        "ring-2 ring-primary-500 ring-offset-2",
                    )}
                  />
                ))}
              </div>
            </fieldset>

            <Labelled label="Chapter Name ">
              <input
                placeholder="e.g Grieving a parent"
                className={FIELD}
              />
            </Labelled>

            <Labelled label="Label">
              <input placeholder="e.g The first year" className={FIELD} />
            </Labelled>

            <Labelled label="What’s this Chapter for?">
              <textarea
                rows={4}
                placeholder="Who should find this room, and why?"
                className={cn(FIELD, "block h-[129px] w-full resize-y")}
              />
            </Labelled>

            <div className="border-t border-ink-50 pt-6">
              <Button type="submit" size="sm" fullWidth>
                Create group
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/** Input 1088:4 — ivory-100, 8px radius, 10/14 padding, xs shadow. */
const FIELD =
  "flex w-full items-center gap-2 rounded-lg bg-ivory-100 px-3.5 py-2.5 font-sans text-base text-ink-500 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] outline-none placeholder:text-ink-300 focus:shadow-[0px_0px_0px_4px_rgba(249,189,152,0.25)]";

function Labelled({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-sans text-sm font-medium text-ink-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="size-5" aria-hidden="true">
      <path
        d="m3.5 3.5 9 9m0-9-9 9"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
